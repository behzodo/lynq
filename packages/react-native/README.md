# lynq-react-native

Lynq announcements and surveys for React Native and Expo apps — the same
banners, popups and surveys the embed script shows on a website, rendered with
native views.

Runs in Expo Go: everything here is plain JavaScript, with no native module to
link.

## Install

```bash
npm install lynq-react-native
# recommended, so dismissals survive a restart
npx expo install @react-native-async-storage/async-storage
```

## Use

Wrap the app once, near the root:

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LynqProvider, asyncStorage } from "lynq-react-native";

export default function App() {
  return (
    <LynqProvider
      convexHttpUrl="https://your-deployment.convex.site"
      organizationId="org_..."
      storage={asyncStorage(AsyncStorage)}
    >
      <RootNavigator />
    </LynqProvider>
  );
}
```

That is the whole integration. Anything published in the dashboard for iOS or
Android now shows in the app.

### Props

| Prop | Required | What it does |
| --- | --- | --- |
| `convexHttpUrl` | yes | Convex HTTP actions live on the `.site` domain, not `.cloud` |
| `organizationId` | yes | From the dashboard |
| `departmentId` | no | Which product this app is. Omit to see organization-wide items only |
| `storage` | no | Where dismissals are remembered. Without it they live in memory and a dismissed banner returns on the next launch |
| `insets` | no | Safe-area padding. Pass values from `react-native-safe-area-context` if the app has it |
| `platform` | no | Defaults to the platform it is running on |
| `onError` | no | Network and parse failures. Nothing is thrown at the app |
| `autoRender` | no | `false` to render nothing and drive the UI yourself |

### Rendering it yourself

`autoRender={false}` leaves the data to you:

```tsx
const { announcements, dismiss } = useAnnouncements();
const { survey, submit, dismiss: skip } = useSurvey();
```

## How it differs from the web

Announcements and surveys share their rules with the browser embed through
`lynq-sdk-core`, so what shows, what stays dismissed and how long a survey
waits are identical. Three things are necessarily different on a phone:

- **Surveys ignore `bottom-left` / `bottom-right`.** A phone has no corner to
  spare, so both become a sheet across the bottom. `center` stays centered.
- **The feed refreshes when the app returns to the foreground.** A website
  re-fetches on every page load; an app can sit in the background for days.
- **CTAs open through `Linking`**, so `https://` links and deep links such as
  `myapp://product/123` both work. Use a deep link to send someone to a screen
  inside the app instead of out to a browser.

## Publishing

This package depends on `lynq-sdk-core` through the workspace. pnpm rewrites
that to a real version on publish, so `lynq-sdk-core` has to be published
first, or at the same time.
