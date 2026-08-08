import Image from "next/image";

export const ConversationsView = () => {
  return (
    <div className="flex h-full flex-1 flex-col gap-y-4 bg-muted">
      <div className="flex flex-1 flex-col items-center justify-center gap-y-3">
        <Image
          alt="Lynq"
          // The mark is black line art on white; multiply drops the white box
          className="mix-blend-multiply"
          height={72}
          src="/logo-mark.jpg"
          width={72}
        />
        <div className="space-y-1 text-center">
          <p className="font-semibold text-lg">Lynq</p>
          <p className="text-muted-foreground text-sm">
            Pick a conversation to get started
          </p>
        </div>
      </div>
    </div>
  );
};
