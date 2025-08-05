import AnimatedIcon from "@/components/AnimatedIcon";

export default function Page() {
  return (
    <AnimatedIcon
      initialIconSrc="/icons/bottom/account.svg"
      targetIconSrc="/icons/bottom/bridge.svg"
      buttonText="Toggle Profile/Settings"
      className="my-4"
      iconSize={48}
    />
  );
}