# DohaTV quality update

## Implemented in this review build
- Fixed Pages output: copies the 11 product gallery images and deploys when product images change.
- CI runs the existing Node dashboard tests before Pages publishing and APK build; APK CI also starts when gallery images change.
- Weather and prayer cards now show last successful refresh time. Weather refreshes every 30 minutes and prayer times every 6 hours while the dashboard is active. Failed refreshes preserve last-known-good data and label it stale.
- Gallery and rotating dhikr pause while the screensaver is visible.
- D-pad navigation now chooses the nearest visible control in the pressed direction instead of jumping through a flat list. Select options can be changed with the remote; URL input retains its text-editing keys, with Escape to leave it.
- Android target SDK raised from 28 to 35 and app backup disabled to use the current platform baseline and avoid backing up local preferences.

## Decisions and limits
- Prayer audio/banner still requires the dashboard to be open. Background notifications/alarms were not added because they need separate permission/opt-in and device behavior choices.
- Existing three APK files in the repo have identical SHA-256 hashes. They are left in place in this branch to avoid breaking existing links; consider removing them after deciding which public download URL should remain.
- Third-party adhan source licensing is still subject to the README caution; no redistribution claim is added.
- Debug builds use Android's debug signing key and are for testing only. No release signing keys were added.
- The target SDK bump and remote navigation need validation on the user's actual Android TV models before merging or wider release.
- The updated debug APK is signed with the temporary build environment's Android debug key, not the certificate from the APK files currently checked into the repository. Android may require uninstalling the older app before installing this review build; uninstalling clears its local settings.
