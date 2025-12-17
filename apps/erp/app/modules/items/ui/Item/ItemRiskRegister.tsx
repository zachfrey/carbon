import RiskRegisterCard from "~/modules/quality/ui/RiskRegister/RiskRegisterCard";

type ItemRiskRegisterProps = {
  itemId: string;
};

export default function ItemRiskRegister({ itemId }: ItemRiskRegisterProps) {
  return <RiskRegisterCard sourceId={itemId} source="Item" itemId={itemId} />;
}
