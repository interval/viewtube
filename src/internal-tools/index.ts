import Interval from "@interval/sdk";
import path from "path";

const interval = new Interval({
  apiKey: process.env.INTERVAL_API_KEY,
  routesDirectory: path.join(__dirname, "routes"),
});

interval.listen();

export default interval;
