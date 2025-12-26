import RiskRegisterCard from "~/modules/quality/ui/RiskRegister/RiskRegisterCard";

type CustomerRiskRegisterProps = {
  customerId: string;
};

export default function CustomerRiskRegister({
  customerId
}: CustomerRiskRegisterProps) {
  return <RiskRegisterCard sourceId={customerId} source="Customer" />;
}
