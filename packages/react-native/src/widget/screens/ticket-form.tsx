import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation } from "convex/react";

import * as api from "../api";
import { TICKET_CATEGORIES } from "../constants";
import { useWidget } from "../context";
import { WidgetHeader } from "../ui/header";
import { ChipGroup, Field, PrimaryButton } from "../ui/primitives";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<
  Record<"name" | "surname" | "email" | "subject" | "description", string>
>;

export function TicketFormScreen() {
  const {
    contactSessionId,
    organizationId,
    setErrorMessage,
    setScreen,
    setTicketId,
    theme,
  } = useWidget();

  const createTicket = useMutation(api.createTicket);

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<api.TicketCategory>("question");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const next: Errors = {};

    if (!name.trim()) next.name = "First name is required";
    if (!surname.trim()) next.surname = "Last name is required";
    if (!EMAIL.test(email.trim())) next.email = "Invalid email address";
    if (!subject.trim()) next.subject = "Subject is required";
    if (!description.trim()) next.description = "Please describe the issue";

    setErrors(next);

    if (Object.keys(next).length > 0) {
      return;
    }

    if (!contactSessionId) {
      setScreen("auth");
      return;
    }

    setIsSubmitting(true);

    try {
      const { ticketId } = await createTicket({
        organizationId,
        contactSessionId,
        name: name.trim(),
        surname: surname.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        category,
        subject: subject.trim(),
        description: description.trim(),
      });

      setTicketId(ticketId);
      setScreen("ticket");
    } catch {
      setErrorMessage("Could not create the ticket. Please try again.");
      setScreen("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <WidgetHeader onBack={() => setScreen("tickets")}>
        <Text style={[styles.heading, { color: theme.accentForeground }]}>
          New ticket
        </Text>
      </WidgetHeader>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pair}>
            <View style={styles.flex}>
              <Field
                autoCapitalize="words"
                error={errors.name}
                label="First name"
                onChangeText={setName}
                placeholder="John"
                value={name}
              />
            </View>
            <View style={styles.flex}>
              <Field
                autoCapitalize="words"
                error={errors.surname}
                label="Last name"
                onChangeText={setSurname}
                placeholder="Doe"
                value={surname}
              />
            </View>
          </View>

          <Field
            autoCapitalize="none"
            error={errors.email}
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="john.doe@example.com"
            value={email}
          />

          <Field
            autoCapitalize="none"
            keyboardType="phone-pad"
            label="Phone (optional)"
            onChangeText={setPhone}
            placeholder="+1 555 000 1234"
            value={phone}
          />

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.foreground }]}>
              Category
            </Text>
            <ChipGroup
              onChange={setCategory}
              options={TICKET_CATEGORIES}
              value={category}
            />
          </View>

          <Field
            error={errors.subject}
            label="Subject"
            onChangeText={setSubject}
            placeholder="Short summary of the issue"
            value={subject}
          />

          <Field
            error={errors.description}
            label="Describe the issue"
            multiline
            onChangeText={setDescription}
            placeholder="What happened? What did you expect?"
            value={description}
          />

          <PrimaryButton
            label={isSubmitting ? "Submitting..." : "Submit ticket"}
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
  heading: {
    fontSize: 16,
    fontWeight: "600",
  },
  body: {
    flexGrow: 1,
    gap: 16,
    padding: 16,
  },
  pair: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
});
