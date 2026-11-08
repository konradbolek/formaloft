import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminPage } from "./AdminPage.jsx";
import { CalculatorPage } from "./CalculatorPage.jsx";
import { TvCalculatorPage } from "./TvCalculatorPage.jsx";
import { RegalCalculatorPage } from "./RegalCalculatorPage.jsx";
import { ContactPage } from "./ContactPage.jsx";
import { Home } from "./Home.jsx";
import { Layout } from "./Layout.jsx";
import { CalculatorsPage, CompanyPage, OpinionsPage, RealizationsPage } from "./StoryPages.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="admin" element={<AdminPage />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="firma" element={<CompanyPage />} />
          <Route path="realizacje" element={<RealizationsPage />} />
          <Route path="opinie" element={<OpinionsPage />} />
          <Route path="kalkulatory" element={<CalculatorsPage />} />
          <Route path="kalkulator/stojak-na-drewno" element={<CalculatorPage />} />
          <Route path="kalkulator/polka-pod-telewizor" element={<TvCalculatorPage />} />
          <Route path="kalkulator/regal" element={<RegalCalculatorPage />} />
          <Route path="kontakt" element={<ContactPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
