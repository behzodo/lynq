import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { FormSchema } from "../../types";
import { widgetSettingsSchema } from "../../schemas";
import { useRef, useState } from "react";
import { ImageIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";

type WidgetSettings = Doc<"widgetSettings"> & { logoUrl: string | null };

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

interface CustomizationFormProps {
  initialData?: WidgetSettings | null;
};

export const CustomizationForm = ({
  initialData,
}: CustomizationFormProps) => {
  const upsertWidgetSettings = useMutation(api.private.widgetSettings.upsert);
  const generateUploadUrl = useMutation(
    api.private.widgetSettings.generateUploadUrl,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialData?.logoUrl ?? null,
  );
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(widgetSettingsSchema),
    defaultValues: {
      greetMessage:
        initialData?.greetMessage || "Hi! How can I help you today?",
      defaultSuggestions: {
        suggestion1: initialData?.defaultSuggestions.suggestion1 || "",
        suggestion2: initialData?.defaultSuggestions.suggestion2 || "",
        suggestion3: initialData?.defaultSuggestions.suggestion3 || "",
      },
      logoStorageId: initialData?.logoStorageId ?? undefined,
    },
  });

  const handleLogoSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    // Let the same file be picked again after a failed attempt
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error("Logo must be a PNG, JPG, WEBP or SVG");
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo must be smaller than 2MB");
      return;
    }

    setIsUploading(true);

    try {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed with status ${result.status}`);
      }

      const { storageId } = (await result.json()) as { storageId: string };

      form.setValue("logoStorageId", storageId, { shouldDirty: true });
      setLogoPreview(URL.createObjectURL(file));
      toast.success("Logo uploaded — save to apply it");
    } catch (error) {
      console.error(error);
      toast.error("Could not upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    form.setValue("logoStorageId", undefined, { shouldDirty: true });
    setLogoPreview(null);
  };

  const onSubmit = async (values: FormSchema) => {
    try {
      await upsertWidgetSettings({
        greetMessage: values.greetMessage,
        defaultSuggestions: values.defaultSuggestions,
        logoStorageId: values.logoStorageId
          ? (values.logoStorageId as Id<"_storage">)
          : undefined,
      });

      toast.success("Widget settings saved");
    } catch(error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Brand Logo</CardTitle>
            <CardDescription>
              Shown on the chat bubble and the widget header
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-x-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {logoPreview ? (
                  // Convex storage URLs are remote and unoptimized, so a plain
                  // img avoids next/image remote-pattern configuration
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Brand logo preview"
                    className="size-full object-contain"
                    src={logoPreview}
                  />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground" />
                )}
              </div>

              <div className="flex flex-col gap-y-2">
                <div className="flex items-center gap-x-2">
                  <Button
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {isUploading ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <UploadIcon />
                    )}
                    {logoPreview ? "Replace" : "Upload logo"}
                  </Button>

                  {logoPreview && (
                    <Button
                      disabled={isUploading}
                      onClick={handleRemoveLogo}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <XIcon />
                      Remove
                    </Button>
                  )}
                </div>

                <p className="text-muted-foreground text-xs">
                  PNG, JPG, WEBP or SVG. Up to 2MB. Square images look best.
                </p>
              </div>

              <input
                accept={ACCEPTED_LOGO_TYPES.join(",")}
                className="hidden"
                onChange={handleLogoSelected}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>General Chat Settings</CardTitle>
            <CardDescription>
              Configure basic chat widget behavior and messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="greetMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Greeting Message</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Welcome message shown when chat open"
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    The first message customers see when they open the chat
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="mb-4 text-sm">
                  Default Suggestions
                </h3>
                <p className="mb-4 text-muted-foreground text-sm">
                  Quick reply suggestions shown to customers to help guide the
                  conversation
                </p>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="defaultSuggestions.suggestion1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suggestion 1</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., How do I get started?"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultSuggestions.suggestion2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suggestion 2</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., What are your pricing plans?"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultSuggestions.suggestion3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suggestion 3</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., I need help with my account"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button disabled={form.formState.isSubmitting} type="submit">
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  );
};
