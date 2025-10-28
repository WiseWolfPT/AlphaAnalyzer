import { u as useLocation, r as reactExports } from "./index-DF734YkB.js";
function Home() {
  const [, setLocation] = useLocation();
  reactExports.useEffect(() => {
    setLocation("/find-stocks");
  }, [setLocation]);
  return null;
}
export {
  Home as default
};
