import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect to find-stocks as the main dashboard
    setLocation("/find-stocks");
  }, [setLocation]);
  
  return null;
}