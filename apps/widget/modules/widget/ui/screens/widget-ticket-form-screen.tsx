"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeftIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { TICKET_CATEGORIES } from "@/modules/widget/constants";
import {
  contactSessionIdAtomFamily,
  errorMessageAtom,
  organizationIdAtom,
  screenAtom,
  ticketIdAtom,
} from "@/modules/widget/atoms/widget-atoms";

const formSchema = z.object({
  name: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  category: z.enum(["question", "bug", "billing", "feature", "other"]),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Please describe the issue"),
});

type FormSchema = z.infer<typeof formSchema>;

export const WidgetTicketFormScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setTicketId = useSetAtom(ticketIdAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);

  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || ""),
  );

  const createTicket = useMutation(api.public.tickets.create);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      surname: "",
      email: "",
      phone: "",
      category: "question",
      subject: "",
      description: "",
    },
  });

  const onSubmit = async (values: FormSchema) => {
    if (!organizationId) {
      setErrorMessage("Missing Organization ID");
      setScreen("error");
      return;
    }

    if (!contactSessionId) {
      setScreen("auth");
      return;
    }

    try {
      const { ticketId } = await createTicket({
        organizationId,
        contactSessionId,
        ...values,
      });

      setTicketId(ticketId);
      setScreen("ticket");
    } catch {
      setErrorMessage("Could not create the ticket. Please try again.");
      setScreen("error");
    }
  };

  return (
    <>
      <WidgetHeader>
        <div className="flex items-center gap-x-2">
          <Button
            variant="transparent"
            size="icon"
            onClick={() => setScreen("selection")}
          >
            <ArrowLeftIcon />
          </Button>
          <p>New ticket</p>
        </div>
      </WidgetHeader>

      <Form {...form}>
        <form
          className="flex flex-1 flex-col gap-y-4 overflow-y-auto p-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid grid-cols-2 gap-x-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-background"
                      placeholder="John"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="surname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-background"
                      placeholder="Doe"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    className="bg-background"
                    placeholder="john.doe@example.com"
                    type="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input
                    className="bg-background"
                    placeholder="+1 555 000 1234"
                    type="tel"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <FormControl>
                  <Input
                    className="bg-background"
                    placeholder="Short summary of the issue"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Describe the issue</FormLabel>
                <FormControl>
                  <Textarea
                    className="bg-background"
                    placeholder="What happened? What did you expect?"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            className="mt-auto"
            disabled={form.formState.isSubmitting}
            size="lg"
            type="submit"
          >
            {form.formState.isSubmitting ? "Submitting..." : "Submit ticket"}
          </Button>
        </form>
      </Form>
    </>
  );
};
