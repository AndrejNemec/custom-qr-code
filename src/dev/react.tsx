import { createRoot } from "react-dom/client";
import { CustomQRCode } from "../react";

const App = () => {
  return (
    <div>
      <CustomQRCode
        data="https://www.facebook.com"
        width={200}
        height={200}
        margin={10}
        image="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"
      />
    </div>
  );
};

// biome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.getElementById("root")!).render(<App />);
