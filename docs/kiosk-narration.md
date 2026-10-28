# Kiosk narration assets

The kiosk does not use browser speech synthesis. Natural voice recordings can be generated once with a licensed provider and served as ordinary frontend audio assets. No speech API key belongs in Vite or browser code.

Place approved files in `public/audio/kiosk/`, then map language and screen names in `index.json`, for example:

```json
{"ar":{"welcome":"/audio/kiosk/ar-welcome.mp3","menu":"/audio/kiosk/ar-menu.mp3","assistance":"/audio/kiosk/ar-assistance.mp3","identity":"/audio/kiosk/ar-identity.mp3","report-tracking":"/audio/kiosk/ar-tracking.mp3"}}
```

Use native speakers to review every language. Do not include pilgrim names or report details in shared audio files. Playback is user initiated, stops on step/language changes or closing the guide, and honors browser autoplay restrictions. Until an approved clip is supplied, the guide shows visual instructions and does not claim audio is available.

Arabic sample script: أهلاً بك في أُنس. نحن هنا لمساعدتك. اختر لغتك، ثم اختر الخدمة التي تحتاجها. إذا كنت تائهاً، اختر أحتاج إلى مساعدة. أظهر بطاقة نسك كاملة أمام الكاميرا، ثم راجع بياناتك وأرسل الطلب. بعد الإرسال تابع الحالة من الشاشة أو امسح رمز المتابعة بجوالك. خذ وقتك، نحن معك خطوة بخطوة.

## Installed demo audio (2026-10-28)

Generated with ElevenLabs Free using Faris Natural Saudi. Welcome/service introduction in all 13 kiosk languages; additional Arabic card-help and tracking clips. Not a live conversation service, not a recording of a human performer. Native-speaker pronunciation review remains necessary before public use. Local static files only, no provider key in browser code.

Free-plan output is non-commercial and requires attribution. The guide credits ElevenLabs. Commercial deployment requires appropriately licensed recordings regenerated under a suitable plan. Reference: https://elevenlabs.io/docs/overview/administration/billing

## Contextual narration

All 13 languages now have menu, identification-method choice, camera, manual card number, identity review, report tracking and nearby-place instructions. Assets are local; index.json contains src/start/end/text for the relevant segment. Segment boundaries were checked against distinct pauses. This is prerecorded guidance, not open-ended conversational AI. No personal details are sent to the speech provider.

Language selection cycles welcome clips in all languages until a language is selected; other screens play only their own selected-language instructions. New navigation cancels the old audio and timers. Pausing/resuming retains the current position. Browser autoplay permission may require an initial tap; the listening control always remains available. The speaking flag and character animation reflect actual successful playback.
