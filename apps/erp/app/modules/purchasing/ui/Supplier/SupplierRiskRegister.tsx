import RiskRegisterCard from "~/modules/quality/ui/RiskRegister/RiskRegisterCard";

type SupplierRiskRegisterProps = {
  supplierId: string;
};

export default function SupplierRiskRegister({
  supplierId
}: SupplierRiskRegisterProps) {
  return <RiskRegisterCard sourceId={supplierId} source="Supplier" />;
}
