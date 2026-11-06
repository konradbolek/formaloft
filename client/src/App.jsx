import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CalculatorPage } from "./CalculatorPage.jsx";
import { TvCalculatorPage } from "./TvCalculatorPage.jsx";
import { RegalCalculatorPage } from "./RegalCalculatorPage.jsx";
import { ContactPage } from "./ContactPage.jsx";
import { Home } from "./Home.jsx";
import { Layout } from "./Layout.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="kalkulator/stojak-na-drewno" element={<CalculatorPage />} />
          <Route path="kalkulator/polka-pod-telewizor" element={<TvCalculatorPage />} />
          <Route path="kalkulator/regal" element={<RegalCalculatorPage />} />
          <Route path="kontakt" element={<ContactPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
