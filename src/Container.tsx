import { ReactNode } from "react";

export default function Container({ children }: { children: ReactNode }) {
  return <div style={containerStyle}>{children}</div>;
}

const containerStyle = {
  width: 900,
  margin: "0 auto",
  padding: "20px 0px",
};
