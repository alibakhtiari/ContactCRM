package com.hero2003.CallLogModule;

import android.Manifest;
import android.content.Context;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

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
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

public class CallLogModule extends ReactContextBaseJavaModule {
    private static final String TAG = "CallLogModule";
    private static final int PERMISSION_REQUEST_CODE = 100;
    
    private ReactApplicationContext reactContext;
    private final AtomicReference<Promise> permissionPromise = new AtomicReference<>();
    private final AtomicBoolean isRequestingPermissions = new AtomicBoolean(false);
    private PermissionListener permissionListener;

    public CallLogModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        
        this.permissionListener = (requestCode, permissions, grantResults) -> {
            if (requestCode == PERMISSION_REQUEST_CODE) {
                Promise promise = permissionPromise.getAndSet(null);
                if (promise != null) {
                    try {
                        boolean allGranted = grantResults.length > 0;
                        for (int result : grantResults) {
                            if (result != PackageManager.PERMISSION_GRANTED) {
                                allGranted = false;
                                break;
                            }
                        }
                        
                        Log.d(TAG, "Permission request completed: " + allGranted);
                        promise.resolve(allGranted);
                    } catch (Exception e) {
                        Log.e(TAG, "Error resolving permission promise", e);
                        promise.reject("PERMISSION_PROMISE_ERROR", "Error handling permission result", e);
                    }
                }
                isRequestingPermissions.set(false);
                return true;
            }
            return false;
        };
        
        BaseActivityEventListener activityEventListener = new BaseActivityEventListener() {
            @Override
            public void onActivityResult(android.app.Activity activity, int requestCode, int resultCode, android.content.Intent intent) {
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
        try {
            // Prevent multiple concurrent permission requests
            if (isRequestingPermissions.getAndSet(true)) {
                promise.reject("ALREADY_REQUESTING", "Permission request already in progress");
                return;
            }

            // Check if activity is available
            PermissionAwareActivity activity = (PermissionAwareActivity) getCurrentActivity();
            if (activity == null) {
                Log.e(TAG, "No current activity available for permission request");
                promise.reject("NO_ACTIVITY", "No current activity available");
                isRequestingPermissions.set(false);
                return;
            }

            // Set the promise before requesting
            permissionPromise.set(promise);
            
            String[] permissions = {
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.READ_CALL_LOG
            };

            Log.d(TAG, "Requesting permissions: " + String.join(", ", permissions));
            activity.requestPermissions(permissions, PERMISSION_REQUEST_CODE, permissionListener);
            
        } catch (Exception e) {
            Log.e(TAG, "Error requesting permissions", e);
            isRequestingPermissions.set(false);
            permissionPromise.set(null);
            promise.reject("PERMISSION_REQUEST_ERROR", "Failed to request permissions", e);
        }
    }

    @ReactMethod
    public void getCallLogs(Promise promise) {
        try {
            Log.d(TAG, "Getting call logs");
            
            // Check permissions first
            if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("PERMISSION_DENIED", "READ_CALL_LOG permission not granted");
                return;
            }
            
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

            Cursor cursor = null;
            try {
                cursor = contentResolver.query(callUri, projection, null, null, CallLog.Calls.DATE + " DESC");
                
                if (cursor == null) {
                    Log.w(TAG, "Call log cursor is null, returning empty array");
                    promise.resolve(Arguments.createArray());
                    return;
                }

                WritableArray callLogs = Arguments.createArray();
                
                while (cursor.moveToNext()) {
                    try {
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
                    } catch (Exception e) {
                        Log.w(TAG, "Error processing individual call log entry", e);
                        // Continue with next entry
                    }
                }
                
                Log.d(TAG, "Successfully retrieved " + callLogs.size() + " call logs");
                promise.resolve(callLogs);
                
            } finally {
                if (cursor != null) {
                    cursor.close();
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting call logs", e);
            promise.reject("CALL_LOG_ERROR", "Failed to get call logs: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void getContacts(Promise promise) {
        try {
            Log.d(TAG, "Getting contacts");
            
            // Check permissions first
            if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("PERMISSION_DENIED", "READ_CONTACTS permission not granted");
                return;
            }
            
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
            
            Cursor cursor = null;
            try {
                cursor = contentResolver.query(contactsUri, projection, selection, null, "display_name ASC");
                
                if (cursor == null) {
                    Log.w(TAG, "Contacts cursor is null, returning empty array");
                    promise.resolve(Arguments.createArray());
                    return;
                }

                WritableArray contacts = Arguments.createArray();
                
                while (cursor.moveToNext()) {
                    try {
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
                    } catch (Exception e) {
                        Log.w(TAG, "Error processing individual contact entry", e);
                        // Continue with next entry
                    }
                }
                
                Log.d(TAG, "Successfully retrieved " + contacts.size() + " contacts");
                promise.resolve(contacts);
                
            } finally {
                if (cursor != null) {
                    cursor.close();
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting contacts", e);
            promise.reject("CONTACTS_ERROR", "Failed to get contacts: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void isPermissionGranted(String permission, Promise promise) {
        try {
            int result = reactContext.checkCallingOrSelfPermission(permission);
            boolean granted = result == PackageManager.PERMISSION_GRANTED;
            Log.d(TAG, "Permission " + permission + " granted: " + granted);
            promise.resolve(granted);
        } catch (Exception e) {
            Log.e(TAG, "Error checking permission: " + permission, e);
            promise.reject("PERMISSION_CHECK_ERROR", "Failed to check permission: " + e.getMessage(), e);
        }
    }

    /**
     * Get detailed permission status
     */
    @ReactMethod
    public void getPermissionStatus(Promise promise) {
        try {
            WritableMap status = Arguments.createMap();
            
            String[] requiredPermissions = {
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.READ_CALL_LOG
            };
            
            for (String permission : requiredPermissions) {
                boolean granted = ContextCompat.checkSelfPermission(reactContext, permission) 
                    == PackageManager.PERMISSION_GRANTED;
                String permissionName = permission.replace("android.permission.", "");
                status.putBoolean(permissionName, granted);
            }
            
            promise.resolve(status);
        } catch (Exception e) {
            Log.e(TAG, "Error getting permission status", e);
            promise.reject("PERMISSION_STATUS_ERROR", "Failed to get permission status", e);
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
