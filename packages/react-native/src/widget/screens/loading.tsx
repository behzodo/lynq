import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAction, useMutation, useQuery } from "convex/react";

import * as api from "../api";
import { useWidget } from "../context";
import { WidgetGreeting, WidgetHeader } from "../ui/header";

type InitStep = "org" | "session" | "settings" | "done";

/**
 * The boot sequence: is the organization real, is the stored session still
 * good, and what are this organization's widget settings. Each step gates the
 * next so a failure lands on the error screen with a reason rather than a
 * half-loaded chat.
 */
export function LoadingScreen() {
  const {
    contactSessionId,
    loadingMessage,
    organizationId,
    sessionRestored,
    setErrorMessage,
    setLoadingMessage,
    setScreen,
    setWidgetSettings,
    theme,
  } = useWidget();

  const [step, setStep] = useState<InitStep>("org");
  const [sessionValid, setSessionValid] = useState(false);

  const validateOrganization = useAction(api.validateOrganization);
  const validateContactSession = useMutation(api.validateContactSession);

  // Step 1: the organization exists
  useEffect(() => {
    if (step !== "org") {
      return;
    }

    setLoadingMessage("Verifying organization...");

    validateOrganization({ organizationId })
      .then((result) => {
        if (result.valid) {
          setStep("session");
          return;
        }

        setErrorMessage(result.reason || "Invalid configuration");
        setScreen("error");
      })
      .catch(() => {
        setErrorMessage("Unable to verify organization");
        setScreen("error");
      });
  }, [
    step,
    organizationId,
    validateOrganization,
    setErrorMessage,
    setLoadingMessage,
    setScreen,
  ]);

  // Step 2: the stored session is still live. Waits for the read to finish, so
  // a slow store is never mistaken for a missing session.
  useEffect(() => {
    if (step !== "session" || !sessionRestored) {
      return;
    }

    if (!contactSessionId) {
      setSessionValid(false);
      setStep("settings");
      return;
    }

    setLoadingMessage("Validating session...");

    validateContactSession({ contactSessionId })
      .then((result) => {
        setSessionValid(result.valid);
        setStep("settings");
      })
      .catch(() => {
        setSessionValid(false);
        setStep("settings");
      });
  }, [
    step,
    sessionRestored,
    contactSessionId,
    validateContactSession,
    setLoadingMessage,
  ]);

  // Step 3: widget settings, for the greeting and the chat suggestions
  const widgetSettings = useQuery(api.getWidgetSettings, { organizationId });

  useEffect(() => {
    if (step !== "settings") {
      return;
    }

    setLoadingMessage("Loading widget settings...");

    if (widgetSettings !== undefined) {
      setWidgetSettings(widgetSettings);
      setStep("done");
    }
  }, [step, widgetSettings, setWidgetSettings, setLoadingMessage]);

  useEffect(() => {
    if (step !== "done") {
      return;
    }

    setScreen(contactSessionId && sessionValid ? "selection" : "auth");
  }, [step, contactSessionId, sessionValid, setScreen]);

  return (
    <>
      <WidgetHeader>
        <WidgetGreeting />
      </WidgetHeader>
      <View style={styles.body}>
        <ActivityIndicator color={theme.mutedForeground} />
        <Text style={[styles.message, { color: theme.mutedForeground }]}>
          {loadingMessage || "Loading..."}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 16,
  },
  message: {
    fontSize: 13,
  },
});
