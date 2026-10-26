package com.gathin.tvhome;

import androidx.dynamicanimation.animation.SpringAnimation;
import androidx.dynamicanimation.animation.SpringForce;

/** Reduced motion (config.xml reduced_motion): the one spring and the one time limit every animation uses then. */
final class Motion {

    /** The longest any reduced-motion animation runs, in milliseconds. */
    static final int REDUCED_MS = 90;
    /** Critically damped (no bounce) and stiff enough that any move, even across the screen, settles in 5 frames. */
    static final float REDUCED_STIFFNESS = 15000f;
    /** The spring stops once it is within this many pixels of its target. */
    static final float REDUCED_MIN_CHANGE = 2f;

    private Motion() {
    }

    /** Scales focus-transition times while retaining the same animation and endpoints. */
    static int focusDuration(int durationMs, int percent) {
        int scale = Math.max(50, Math.min(100, percent));
        return Math.max(1, Math.round(durationMs * scale / 100f));
    }

    /** A spring settles in proportion to 1/sqrt(stiffness), so scale stiffness by the inverse square. */
    static float focusStiffness(float stiffness, int percent) {
        float scale = 100f / Math.max(50, Math.min(100, percent));
        return stiffness * scale * scale;
    }

    static void reduce(SpringAnimation spring) {
        spring.setSpring(new SpringForce().setStiffness(REDUCED_STIFFNESS).setDampingRatio(SpringForce.DAMPING_RATIO_NO_BOUNCY));
        spring.setMinimumVisibleChange(REDUCED_MIN_CHANGE);
    }
}
