import RiskRegisterCard from "~/modules/quality/ui/RiskRegister/RiskRegisterCard";

type JobRiskRegisterProps = {
  jobId: string;
  itemId: string;
};

export default function JobRiskRegister({
  jobId,
  itemId
}: JobRiskRegisterProps) {
  return <RiskRegisterCard sourceId={jobId} source="Job" itemId={itemId} />;
}
