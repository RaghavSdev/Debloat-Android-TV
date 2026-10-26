package com.gathin.tvhome;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Path;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Toast;

import java.util.List;

/** Toggles the installed AirPlay Server from a theme-mapped remote key, then returns to Home. */
final class AirPlayToggle {
    private static final String SERVER_PACKAGE = "io.github.jqssun.airplay";
    private static final String SERVER_ACTIVITY = "io.github.jqssun.airplay.MainActivity";
    private static final String PREFS = "airplay_toggle";
    private static final String ENABLED = "server_on";
    private static final String LAST_UPTIME = "last_uptime";
    private static final long OPEN_DELAY_MS = 500;
    private static final long RETRY_MS = 250;
    private static final int MAX_RETRIES = 8;
    private static final Handler HANDLER = new Handler(Looper.getMainLooper());

    private static boolean pending;
    private static AccessibilityService pendingService;
    private static boolean fallbackCurrentOn;

    private AirPlayToggle() { }

    static boolean isLauncherHome(AccessibilityService service) {
        AccessibilityNodeInfo root = service.getRootInActiveWindow();
        if (root == null) return false;
        CharSequence packageName = root.getPackageName();
        boolean home = packageName != null && service.getPackageName().contentEquals(packageName);
        root.recycle();
        return home;
    }

    static void toggle(AccessibilityService service) {
        if (!isLauncherHome(service)) return;
        if (pending) return;

        SharedPreferences preferences = service.getSharedPreferences(PREFS, 0);
        long now = SystemClock.elapsedRealtime();
        long previousUptime = preferences.getLong(LAST_UPTIME, now);
        // AirPlay Server's boot_auto_start is enabled on this TV, so a device reboot starts the receiver again.
        fallbackCurrentOn = now < previousUptime || preferences.getBoolean(ENABLED, true);

        pending = true;
        pendingService = service;
        Intent open = new Intent().setComponent(new ComponentName(SERVER_PACKAGE, SERVER_ACTIVITY))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_ANIMATION
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        try {
            service.startActivity(open);
            HANDLER.postDelayed(() -> inspectAndToggle(service, 0), OPEN_DELAY_MS);
        } catch (RuntimeException unavailable) {
            finish(service, fallbackCurrentOn, false);
        }
    }

    private static void inspectAndToggle(AccessibilityService service, int retries) {
        if (!isPending(service)) return;
        AccessibilityNodeInfo root = service.getRootInActiveWindow();
        if (root != null) {
            CharSequence packageName = root.getPackageName();
            if (packageName != null && SERVER_PACKAGE.contentEquals(packageName)) {
                Boolean currentlyOn = serverRunning(root);
                if (currentlyOn != null) {
                    boolean nextOn = !currentlyOn;
                    boolean clicked = clickButton(root, currentlyOn ? "Stop" : "Start");
                    root.recycle();
                    if (clicked) {
                        finishAfterClick(service, nextOn, 650);
                    } else {
                        tapButton(service, nextOn);
                    }
                    return;
                }
            }
            root.recycle();
        }

        if (retries < MAX_RETRIES) {
            HANDLER.postDelayed(() -> inspectAndToggle(service, retries + 1), RETRY_MS);
            return;
        }

        // Compose accessibility labels may be absent on older TV builds. The saved state is refreshed whenever
        // the receiver screen is visible and is reset after reboot to match its enabled boot auto-start setting.
        tapButton(service, !fallbackCurrentOn);
    }

    private static Boolean serverRunning(AccessibilityNodeInfo root) {
        if (hasExactText(root, "Stop")) return true;
        if (hasExactText(root, "Start")) return false;
        return null;
    }

    private static boolean hasExactText(AccessibilityNodeInfo root, String text) {
        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(text);
        if (nodes == null) return false;
        boolean found = false;
        for (AccessibilityNodeInfo node : nodes) {
            CharSequence value = node.getText();
            if (value != null && text.contentEquals(value.toString().trim())) found = true;
            node.recycle();
        }
        return found;
    }

    private static boolean clickButton(AccessibilityNodeInfo root, String text) {
        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(text);
        if (nodes == null) return false;
        boolean clicked = false;
        for (AccessibilityNodeInfo node : nodes) {
            CharSequence value = node.getText();
            if (value != null && text.contentEquals(value.toString().trim())
                    && node.isClickable() && node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                clicked = true;
            }
            node.recycle();
            if (clicked) break;
        }
        return clicked;
    }

    private static void tapButton(AccessibilityService service, boolean nextOn) {
        if (!isPending(service)) return;
        float width = service.getResources().getDisplayMetrics().widthPixels;
        float height = service.getResources().getDisplayMetrics().heightPixels;
        // AirPlay Server's Start/Stop button is at the lower right on its landscape TV screen.
        Path path = new Path();
        path.moveTo(width * 0.91f, height * 0.74f);
        GestureDescription gesture = new GestureDescription.Builder()
                .addStroke(new GestureDescription.StrokeDescription(path, 0, 90))
                .build();
        boolean accepted = service.dispatchGesture(gesture, new AccessibilityService.GestureResultCallback() {
            @Override
            public void onCompleted(GestureDescription completedGesture) {
                finishAfterClick(service, nextOn, 650);
            }

            @Override
            public void onCancelled(GestureDescription cancelledGesture) {
                finish(service, fallbackCurrentOn, false);
            }
        }, HANDLER);
        if (!accepted) finish(service, fallbackCurrentOn, false);
    }

    private static void finishAfterClick(AccessibilityService service, boolean nextOn, long delayMs) {
        HANDLER.postDelayed(() -> finish(service, nextOn, true), delayMs);
    }

    private static boolean isPending(AccessibilityService service) {
        return pending && pendingService == service;
    }

    private static void finish(AccessibilityService service, boolean nextOn, boolean success) {
        if (!isPending(service)) return;
        pending = false;
        pendingService = null;
        if (success) {
            service.getSharedPreferences(PREFS, 0).edit()
                    .putBoolean(ENABLED, nextOn)
                    .putLong(LAST_UPTIME, SystemClock.elapsedRealtime())
                    .apply();
        }
        service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);
        HANDLER.postDelayed(() -> Toast.makeText(service,
                success ? (nextOn ? R.string.airplay_on : R.string.airplay_off) : R.string.airplay_toggle_failed,
                Toast.LENGTH_SHORT).show(), 300);
    }
}
