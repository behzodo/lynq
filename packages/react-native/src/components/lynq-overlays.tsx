import { Platform, SafeAreaView, StyleSheet } from "react-native";
import type { Announcement } from "lynq-sdk-core";

import { useLynq } from "../context";
import { useAnnouncements, useSurvey } from "../hooks";
import { AnnouncementBanner } from "./announcement-banner";
import { AnnouncementPopup } from "./announcement-popup";
import { SurveyCard } from "./survey-card";

const isTopBanner = (announcement: Announcement) =>
  announcement.type === "banner" && announcement.position === "top";

const isBottomBanner = (announcement: Announcement) =>
  announcement.type === "banner" && announcement.position !== "top";

/**
 * Everything Lynq draws on top of the app: banners at the edges, one popup,
 * and at most one survey. Rendered by LynqProvider unless autoRender is off.
 */
export function LynqOverlays() {
  const { insets } = useLynq();
  const { announcements, dismiss } = useAnnouncements();
  const { survey, submit, dismiss: dismissSurvey } = useSurvey();

  const topBanners = announcements.filter(isTopBanner);
  const bottomBanners = announcements.filter(isBottomBanner);
  // The feed already guarantees at most one popup
  const popup = announcements.find(
    (announcement) => announcement.type === "popup",
  );

  const banner = (announcement: Announcement) => (
    <AnnouncementBanner
      announcement={announcement}
      key={announcement.id}
      onDismiss={() => {
        void dismiss(announcement.id);
      }}
    />
  );

  return (
    <>
      {/*
        SafeAreaView handles the iOS notch and home indicator; the extra inset
        padding covers the Android status bar, or whatever the app passed in.
        box-none lets taps through everywhere except on the banners themselves.
      */}
      {topBanners.length > 0 ? (
        <SafeAreaView
          pointerEvents="box-none"
          style={[styles.stack, styles.top, { paddingTop: insets.top }]}
        >
          {topBanners.map(banner)}
        </SafeAreaView>
      ) : null}

      {bottomBanners.length > 0 ? (
        <SafeAreaView
          pointerEvents="box-none"
          style={[styles.stack, styles.bottom, { paddingBottom: insets.bottom }]}
        >
          {bottomBanners.map(banner)}
        </SafeAreaView>
      ) : null}

      {popup ? (
        <AnnouncementPopup
          announcement={popup}
          onDismiss={() => {
            void dismiss(popup.id);
          }}
        />
      ) : null}

      {survey ? (
        <SurveyCard
          onDismiss={() => {
            void dismissSurvey();
          }}
          onSubmit={(answer) => {
            void submit({
              ...answer,
              // No page URL in an app, so record what device answered instead
              metadata: {
                userAgent: `${Platform.OS} ${String(Platform.Version)}`,
              },
            });
          }}
          survey={survey}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    left: 0,
    position: "absolute",
    right: 0,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
});
