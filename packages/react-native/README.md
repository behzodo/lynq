# lynq-react-native

Lynq for React Native and Expo apps: announcements, surveys, live chat, and
tickets — the same things the embed script gives a website, rendered with
native views.

Runs in Expo Go. Everything here is plain JavaScript, with no native module to
link. An image picker is the one optional exception, and it is injected rather
than required.

## Install

```bash
npm install lynq-react-native convex
# recommended, so sessions and dismissals survive a restart
npx expo install @react-native-async-storage/async-storage
```

## Use

Wrap the app once, near the root, then drop the widget wherever it belongs:

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LynqProvider, LynqWidget, asyncStorage } from "lynq-react-native";

export default function App() {
  return (
    <LynqProvider
      convexUrl="https://your-deployment.convex.cloud"
      organizationId="org_..."
      storage={asyncStorage(AsyncStorage)}
    >
      <RootNavigator />
      <LynqWidget />
    </LynqProvider>
  );
}
```

`LynqProvider` alone gives you announcements and surveys. `LynqWidget` adds the
support widget behind a floating button; pass `mode="inline"` to render it
full-screen inside a tab of your own instead.

### LynqProvider props

| Prop | Required | What it does |
| --- | --- | --- |
| `convexUrl` | yes | The deployment URL Convex gives you, ending `.convex.cloud` |
| `organizationId` | yes | From the dashboard |
| `departmentId` | no | Which product this app is. Omit to see organization-wide items only |
| `storage` | no | Where sessions and dismissals are remembered. Without it they live in memory, so a dismissed banner returns and the visitor signs in again on every launch |
| `accentColor` | no | The widget's brand colour. Defaults to near-black |
| `insets` | no | Safe-area padding. Pass values from `react-native-safe-area-context` if the app has it |
| `convexHttpUrl` | no | Overrides where the feeds are read from. Worked out from `convexUrl` automatically; set it only for a custom or self-hosted domain |
| `platform` | no | Defaults to the platform it is running on |
| `onError` | no | Feed failures. Nothing is thrown at the app |
| `autoRender` | no | `false` to render no announcements or surveys and drive them yourself |

### LynqWidget props

| Prop | What it does |
| --- | --- |
| `mode` | `"launcher"` (default) floats a bubble; `"inline"` fills its container |
| `pickImage` | Enables image attachments in chat. See below |

### Image attachments

Attaching an image needs a native picker, so the SDK takes one rather than
depending on one — without it the attach button simply isn't shown, and Expo Go
keeps working:

```tsx
import * as ImagePicker from "expo-image-picker";

<LynqWidget
  pickImage={async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    const asset = result.assets?.[0];

    return asset
      ? { uri: asset.uri, name: asset.fileName ?? undefined, mimeType: asset.mimeType }
      : null;
  }}
/>
```

### Rendering announcements yourself

`autoRender={false}` leaves the data to you:

```tsx
const { announcements, dismiss } = useAnnouncements();
const { survey, submit, dismiss: skip } = useSurvey();
```

## How it differs from the web

The announcement and survey rules are shared with the browser embed through
`lynq-sdk-core`, and the widget talks to exactly the same Convex functions, so
behaviour matches. What a phone changes:

- **Surveys ignore `bottom-left` / `bottom-right`.** A phone has no corner to
  spare, so both become a sheet across the bottom. `center` stays centered.
- **The announcement feed refreshes when the app returns to the foreground.**
  A website re-fetches on every page load; an app can sit in the background for
  days.
- **CTAs open through `Linking`**, so `https://` links and deep links such as
  `myapp://product/123` both work. A deep link sends someone to a screen inside
  the app instead of out to a browser.
- **The ticket category is a row of chips**, not a dropdown. Five options fit,
  and it saves summoning a native picker.
- **No notification chime and no generated avatars.** Both would mean another
  native dependency for the host app; the message list and its timestamps carry
  the same information.

## Known limitation: session length

A contact session lasts 24 hours (`SESSION_DURATION_MS` in the backend), and it
is what ties someone to their own conversations and tickets. On a website that
is unremarkable. In an installed app it means re-entering a name and email
roughly once a day to see your own support history, which is worth raising
before this ships widely. Chatting extends the session; reading tickets does
not.

## Publishing

This package depends on `lynq-sdk-core` through the workspace. pnpm rewrites
that to a real version on publish, so `lynq-sdk-core` has to be published
first, or at the same time.
