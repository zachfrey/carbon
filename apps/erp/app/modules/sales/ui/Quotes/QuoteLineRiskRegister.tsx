import RiskRegisterCard from "~/modules/quality/ui/RiskRegister/RiskRegisterCard";

type QuoteLineRiskRegisterProps = {
  quoteLineId: string;
  itemId: string;
};

export default function QuoteLineRiskRegister({
  quoteLineId,
  itemId
}: QuoteLineRiskRegisterProps) {
  return (
    <RiskRegisterCard
      sourceId={quoteLineId}
      source="Quote Line"
      itemId={itemId}
    />
  );
}
