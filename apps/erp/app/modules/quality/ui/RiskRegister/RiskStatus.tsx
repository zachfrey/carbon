import type { Database } from "@carbon/database";
import { Status } from "@carbon/react";

type RiskStatusProps = {
  status?: Database["public"]["Enums"]["riskStatus"] | null;
};

const RiskStatus = ({ status }: RiskStatusProps) => {
  switch (status) {
    case "Accepted":
      return <Status color="green">{status}</Status>;
    case "In Review":
      return <Status color="blue">{status}</Status>;
    case "Mitigating":
      return <Status color="orange">{status}</Status>;
    case "Closed":
      return <Status color="red">{status}</Status>;
    case "Open":
      return <Status color="gray">{status}</Status>;
    default:
      return null;
  }
};

export default RiskStatus;
