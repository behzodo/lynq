import { useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useMutation } from "convex/react";

import * as api from "../api";
import { useWidget } from "../context";
import { WidgetGreeting, WidgetHeader } from "../ui/header";
import { Field, PrimaryButton } from "../ui/primitives";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What the browser reads off `navigator`, as far as a phone can answer it.
 * The dashboard shows this beside the conversation, so it is worth filling in
 * even though the shape was designed for the web.
 */
function deviceMetadata(): api.ContactSessionMetadata {
  const { height, width } = Dimensions.get("screen");
  const window = Dimensions.get("window");

  return {
    userAgent: `${Platform.OS} ${String(Platform.Version)}`,
    platform: Platform.OS,
    screenResolution: `${Math.round(width)}x${Math.round(height)}`,
    viewportSize: `${Math.round(window.width)}x${Math.round(window.height)}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
  };
}

export function AuthScreen() {
  const { organizationId, saveContactSessionId, setScreen } = useWidget();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createContactSession = useMutation(api.createContactSession);

  const submit = async () => {
    const next: { name?: string; email?: string } = {};

    if (!name.trim()) {
      next.name = "Name is required";
    }

    if (!EMAIL.test(email.trim())) {
      next.email = "Invalid email address";
    }

    setErrors(next);

    if (next.name || next.email) {
      return;
    }

    setIsSubmitting(true);

    try {
      const contactSessionId = await createContactSession({
        name: name.trim(),
        email: email.trim(),
        organizationId,
        metadata: deviceMetadata(),
      });

      await saveContactSessionId(contactSessionId);
      setScreen("selection");
    } catch {
      setErrors({ email: "Could not start a session. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <WidgetHeader>
        <WidgetGreeting />
      </WidgetHeader>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            autoCapitalize="words"
            error={errors.name}
            label="Name"
            onChangeText={setName}
            placeholder="e.g. John Doe"
            value={name}
          />
          <Field
            autoCapitalize="none"
            error={errors.email}
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="e.g. john.doe@example.com"
            value={email}
          />
          <PrimaryButton
            label="Continue"
            loading={isSubmitting}
            onPress={() => {
              void submit();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    gap: 16,
    padding: 16,
  },
});
