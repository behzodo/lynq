import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Survey, SurveyAnswer } from "lynq-sdk-core";

import { withAlpha } from "../colors";
import { CloseButton } from "./primitives";

/** How long the thank-you stays up before the card closes itself. */
const THANK_YOU_MS = 2000;

const scoreValues = (type: Survey["type"]): number[] =>
  type === "nps"
    ? Array.from({ length: 11 }, (_, index) => index)
    : [1, 2, 3, 4, 5];

function ScoreRow({
  onPick,
  picked,
  survey,
}: {
  onPick: (score: number) => void;
  picked: number | null;
  survey: Survey;
}) {
  const isNps = survey.type === "nps";

  return (
    <View style={styles.scoreBlock}>
      <View style={styles.scoreRow}>
        {scoreValues(survey.type).map((value) => {
          // Stars fill up to the pick; NPS highlights only the number chosen
          const isOn = isNps ? picked === value : picked !== null && value <= picked;

          return (
            <Pressable
              accessibilityLabel={String(value)}
              accessibilityRole="button"
              key={value}
              onPress={() => onPick(value)}
              style={[
                isNps ? styles.npsButton : styles.starButton,
                isNps && {
                  backgroundColor: isOn
                    ? survey.textColor
                    : withAlpha(survey.textColor, 0.1),
                  borderColor: withAlpha(survey.textColor, 0.3),
                },
              ]}
            >
              <Text
                style={[
                  isNps ? styles.npsLabel : styles.star,
                  {
                    color: isNps && isOn ? survey.bgColor : survey.textColor,
                    opacity: isNps || isOn ? 1 : 0.35,
                  },
                ]}
              >
                {isNps ? value : "★"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isNps ? (
        <View style={styles.legend}>
          <Text style={[styles.legendText, { color: survey.textColor }]}>
            Not likely
          </Text>
          <Text style={[styles.legendText, { color: survey.textColor }]}>
            Very likely
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The survey itself.
 *
 * `position` is a desktop idea - a small card tucked into a corner. A phone
 * has no corner to spare, so bottom-left and bottom-right both become a sheet
 * across the bottom, and center stays centered.
 */
export function SurveyCard({
  onDismiss,
  onSubmit,
  survey,
}: {
  onDismiss: () => void;
  onSubmit: (answer: SurveyAnswer) => void;
  survey: Survey;
}) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const needsScore = survey.type !== "text";
  const canSubmit = !needsScore || score !== null;

  // Close on its own once the thank-you has been read
  useEffect(() => {
    if (!submitted) {
      return;
    }

    const timer = setTimeout(onDismiss, THANK_YOU_MS);

    return () => clearTimeout(timer);
  }, [submitted, onDismiss]);

  const submit = () => {
    if (!canSubmit || submitted) {
      return;
    }

    setSubmitted(true);
    onSubmit({
      score: score ?? undefined,
      comment: comment.trim() || undefined,
    });
  };

  const centered = survey.position === "center";

  return (
    <Modal
      animationType={centered ? "fade" : "slide"}
      onRequestClose={onDismiss}
      statusBarTranslucent
      transparent
      visible
    >
      <View
        style={[
          styles.backdrop,
          centered ? styles.backdropCentered : styles.backdropBottom,
        ]}
      >
        <View
          style={[
            styles.card,
            centered ? styles.cardCentered : styles.cardBottom,
            { backgroundColor: survey.bgColor },
          ]}
        >
          <View style={styles.closeRow}>
            <CloseButton color={survey.textColor} onPress={onDismiss} />
          </View>

          {submitted ? (
            <Text style={[styles.thankYou, { color: survey.textColor }]}>
              {survey.thankYouMessage}
            </Text>
          ) : (
            <>
              {survey.title ? (
                <Text style={[styles.title, { color: survey.textColor }]}>
                  {survey.title}
                </Text>
              ) : null}

              <Text style={[styles.question, { color: survey.textColor }]}>
                {survey.question}
              </Text>

              {needsScore ? (
                <ScoreRow onPick={setScore} picked={score} survey={survey} />
              ) : null}

              <TextInput
                multiline
                onChangeText={setComment}
                placeholder={survey.commentLabel || "Tell us more (optional)"}
                placeholderTextColor={withAlpha(survey.textColor, 0.5)}
                style={[
                  styles.comment,
                  {
                    backgroundColor: withAlpha(survey.textColor, 0.08),
                    borderColor: withAlpha(survey.textColor, 0.3),
                    color: survey.textColor,
                  },
                ]}
                value={comment}
              />

              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit}
                onPress={submit}
                style={[
                  styles.submit,
                  {
                    backgroundColor: survey.textColor,
                    opacity: canSubmit ? 1 : 0.5,
                  },
                ]}
              >
                <Text style={[styles.submitLabel, { color: survey.bgColor }]}>
                  Submit
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    flex: 1,
  },
  backdropCentered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backdropBottom: {
    justifyContent: "flex-end",
  },
  card: {
    padding: 20,
  },
  cardCentered: {
    borderRadius: 16,
    maxWidth: 380,
    width: "100%",
  },
  cardBottom: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // Clears the home indicator without needing the real inset
    paddingBottom: 32,
  },
  closeRow: {
    alignItems: "flex-end",
    marginBottom: 4,
    marginRight: -8,
    marginTop: -8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  question: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  scoreBlock: {
    marginTop: 16,
  },
  scoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  starButton: {
    paddingHorizontal: 4,
  },
  star: {
    fontSize: 30,
  },
  npsButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 34,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  npsLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  legendText: {
    fontSize: 11,
    opacity: 0.6,
  },
  comment: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    marginTop: 12,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: "top",
  },
  submit: {
    alignItems: "center",
    borderRadius: 8,
    marginTop: 12,
    paddingVertical: 11,
  },
  submitLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  thankYou: {
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 8,
    textAlign: "center",
  },
});
