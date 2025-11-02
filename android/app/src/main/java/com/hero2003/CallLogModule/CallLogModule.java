package com.hero2003.CallLogModule;

import android.content.Context;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;
import android.util.Log;

import com.facebook.react.bridge.Activity;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.PermissionAwareActivity;
import com.facebook.react.modules.core.PermissionListener;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class CallLogModule extends ReactContextBaseJavaModule {
    private static final String TAG = "CallLogModule";
    private static final int PERMISSION_REQUEST_CODE = 100;
    
    private ReactApplicationContext reactContext;
    private Promise permissionPromise;
    private PermissionListener permissionListener;

    public CallLogModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        
        this.permissionListener = (requestCode, permissions, grantResults) -> {
            if (requestCode == PERMISSION_REQUEST_CODE && permissionPromise != null) {
                boolean allGranted = grantResults.length > 0;
                for (int result : grantResults) {
                    if (result != 0) {
                        allGranted = false;
                        break;
                    }
                }
                permissionPromise.resolve(allGranted);
                permissionPromise = null;
                return true;
            }
            return false;
        };
        
        BaseActivityEventListener activityEventListener = new BaseActivityEventListener() {
            @Override
            public void onActivityResult(com.facebook.react.bridge.Activity activity, int requestCode, int resultCode, android.content.Intent intent) {
                super.onActivityResult(activity, requestCode, resultCode, intent);
            }
        };
        reactContext.addActivityEventListener(activityEventListener);
    }

    @Override
    public String getName() {
        return "CallLogModule";
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("MODULE_NAME", "CallLogModule");
        return constants;
    }

    @ReactMethod
    public void requestPermissions(Promise promise) {
        PermissionAwareActivity activity = (PermissionAwareActivity) getCurrentActivity();
        if (activity == null) {
            promise.resolve(false);
            return;
        }

        permissionPromise = promise;
        String[] permissions = {
            android.Manifest.permission.READ_PHONE_STATE,
            android.Manifest.permission.READ_CALL_LOG,
            android.Manifest.permission.READ_CONTACTS
        };

        activity.requestPermissions(permissions, PERMISSION_REQUEST_CODE, permissionListener);
    }

    @ReactMethod
    public void getCallLogs(Promise promise) {
        try {
            ContentResolver contentResolver = reactContext.getContentResolver();
            Uri callUri = Uri.parse("content://call_log/calls");
            
            String[] projection = {
                CallLog.Calls._ID,
                CallLog.Calls.NUMBER,
                CallLog.Calls.TYPE,
                CallLog.Calls.DATE,
                CallLog.Calls.DURATION,
                CallLog.Calls.CACHED_NAME,
                CallLog.Calls.CACHED_NUMBER_TYPE
            };

            Cursor cursor = contentResolver.query(callUri, projection, null, null, CallLog.Calls.DATE + " DESC");
            
            if (cursor == null) {
                promise.resolve(Arguments.createArray());
                return;
            }

            WritableArray callLogs = Arguments.createArray();
            
            while (cursor.moveToNext()) {
                WritableMap callLog = Arguments.createMap();
                
                String phoneNumber = cursor.getString(cursor.getColumnIndex(CallLog.Calls.NUMBER));
                int callType = cursor.getInt(cursor.getColumnIndex(CallLog.Calls.TYPE));
                long callDate = cursor.getLong(cursor.getColumnIndex(CallLog.Calls.DATE));
                int duration = cursor.getInt(cursor.getColumnIndex(CallLog.Calls.DURATION));
                String cachedName = cursor.getString(cursor.getColumnIndex(CallLog.Calls.CACHED_NAME));
                
                String callTypeStr = getCallTypeString(callType);
                String direction = getCallDirection(callType);
                
                callLog.putString("phoneNumber", phoneNumber != null ? phoneNumber : "");
                callLog.putString("callType", callTypeStr);
                callLog.putString("direction", direction);
                callLog.putDouble("timestamp", callDate);
                callLog.putInt("duration", duration);
                callLog.putString("contactName", cachedName != null ? cachedName : "");
                
                callLogs.pushMap(callLog);
            }
            
            cursor.close();
            promise.resolve(callLogs);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting call logs", e);
            promise.reject("CALL_LOG_ERROR", "Failed to get call logs: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void getContacts(Promise promise) {
        try {
            ContentResolver contentResolver = reactContext.getContentResolver();
            Uri contactsUri = Uri.parse("content://com.android.contacts/data");
            
            String[] projection = {
                "raw_contact_id",
                "display_name",
                "data1", // phone number
                "data2", // phone type
                "mimetype"
            };
            
            String selection = "mimetype = 'vnd.android.cursor.item/phone_v2'";
            
            Cursor cursor = contentResolver.query(contactsUri, projection, selection, null, "display_name ASC");
            
            if (cursor == null) {
                promise.resolve(Arguments.createArray());
                return;
            }

            WritableArray contacts = Arguments.createArray();
            
            while (cursor.moveToNext()) {
                String displayName = cursor.getString(cursor.getColumnIndex("display_name"));
                String phoneNumber = cursor.getString(cursor.getColumnIndex("data1"));
                int phoneType = cursor.getInt(cursor.getColumnIndex("data2"));
                
                if (displayName != null && phoneNumber != null) {
                    WritableMap contact = Arguments.createMap();
                    contact.putString("name", displayName);
                    contact.putString("phoneNumber", phoneNumber);
                    contact.putString("phoneType", getPhoneTypeString(phoneType));
                    
                    contacts.pushMap(contact);
                }
            }
            
            cursor.close();
            promise.resolve(contacts);
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting contacts", e);
            promise.reject("CONTACTS_ERROR", "Failed to get contacts: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void isPermissionGranted(String permission, Promise promise) {
        try {
            int result = reactContext.checkCallingOrSelfPermission(permission);
            promise.resolve(result == android.content.pm.PackageManager.PERMISSION_GRANTED);
        } catch (Exception e) {
            Log.e(TAG, "Error checking permission", e);
            promise.reject("PERMISSION_CHECK_ERROR", "Failed to check permission: " + e.getMessage(), e);
        }
    }

    private String getCallTypeString(int callType) {
        switch (callType) {
            case CallLog.Calls.INCOMING_TYPE:
                return "incoming";
            case CallLog.Calls.OUTGOING_TYPE:
                return "outgoing";
            case CallLog.Calls.MISSED_TYPE:
                return "missed";
            case CallLog.Calls.REJECTED_TYPE:
                return "rejected";
            default:
                return "unknown";
        }
    }

    private String getCallDirection(int callType) {
        switch (callType) {
            case CallLog.Calls.INCOMING_TYPE:
                return "incoming";
            case CallLog.Calls.OUTGOING_TYPE:
                return "outgoing";
            default:
                return "incoming"; // Default to incoming for unknown types
        }
    }

    private String getPhoneTypeString(int phoneType) {
        switch (phoneType) {
            case 1: // Home
                return "home";
            case 2: // Mobile
                return "mobile";
            case 3: // Work
                return "work";
            case 4: // Fax Work
                return "fax_work";
            case 5: // Fax Home
                return "fax_home";
            case 6: // Other
                return "other";
            case 7: // Callback
                return "callback";
            case 8: // Car
                return "car";
            case 9: // Company Main
                return "company_main";
            case 10: // ISDN
                return "isdn";
            case 11: // Main
                return "main";
            case 12: // Other Fax
                return "other_fax";
            case 13: // Telex
                return "telex";
            case 14: // TTY TDD
                return "tty_tdd";
            case 15: // Work Mobile
                return "work_mobile";
            case 16: // Work Pager
                return "work_pager";
            case 17: // Assistant
                return "assistant";
            case 18: // Mms
                return "mms";
            default:
                return "other";
        }
    }
}
