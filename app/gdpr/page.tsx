import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů (GDPR)",
  description: "Informace o zpracování osobních údajů a ochraně soukromí na Pohádkové Platformě v souladu s GDPR.",
};

export default function GDPRPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center font-[family-name:var(--font-cinzel)]">
        Ochrana osobních údajů (GDPR)
      </h1>
      
      <div className="prose prose-lg max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Úvod</h2>
          <p className="text-gray-700 leading-relaxed">
            Tato stránka obsahuje informace o tom, jak Pohádková Platforma zpracovává vaše osobní údaje 
            v souladu s Nařízením Evropského parlamentu a Rady (EU) 2016/679 (GDPR) a zákonem č. 110/2019 Sb., 
            o zpracování osobních údajů.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Správce osobních údajů</h2>
          <p className="text-gray-700 leading-relaxed">
            Správcem vašich osobních údajů je provozovatel Pohádkové Platformy. 
            V případě dotazů ohledně zpracování osobních údajů nás můžete kontaktovat 
            prostřednictvím e-mailu uvedeného v kontaktní sekci.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Jaké údaje zpracováváme</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            V rámci poskytování našich služeb zpracováváme následující kategorie osobních údajů:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Registrační údaje:</strong> e-mailová adresa, uživatelské jméno</li>
            <li><strong>Údaje o aktivitě:</strong> vámi vytvořené pohádky, komentáře, hodnocení</li>
            <li><strong>Technické údaje:</strong> IP adresa, typ prohlížeče, čas přístupu (pro zajištění bezpečnosti)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Účel zpracování</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Vaše osobní údaje zpracováváme pro následující účely:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Poskytování služeb platformy (vytváření a sdílení pohádek)</li>
            <li>Správa uživatelského účtu</li>
            <li>Komunikace s uživateli</li>
            <li>Zajištění bezpečnosti a prevence zneužití</li>
            <li>Zlepšování našich služeb</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Právní základ zpracování</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Osobní údaje zpracováváme na základě:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Plnění smlouvy:</strong> zpracování nezbytné pro poskytování služeb</li>
            <li><strong>Oprávněný zájem:</strong> zajištění bezpečnosti a zlepšování služeb</li>
            <li><strong>Souhlas:</strong> pro marketingovou komunikaci (pokud je poskytnut)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Doba uchovávání údajů</h2>
          <p className="text-gray-700 leading-relaxed">
            Vaše osobní údaje uchováváme po dobu trvání vašeho uživatelského účtu. 
            Po zrušení účtu jsou údaje smazány do 30 dnů, s výjimkou údajů, které jsme 
            povinni uchovávat na základě právních předpisů.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Vaše práva</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            V souvislosti se zpracováním osobních údajů máte následující práva:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Právo na přístup:</strong> můžete požádat o informace o zpracovávaných údajích</li>
            <li><strong>Právo na opravu:</strong> můžete požádat o opravu nepřesných údajů</li>
            <li><strong>Právo na výmaz:</strong> můžete požádat o smazání vašich údajů</li>
            <li><strong>Právo na omezení zpracování:</strong> můžete požádat o omezení zpracování</li>
            <li><strong>Právo na přenositelnost:</strong> můžete požádat o export vašich údajů</li>
            <li><strong>Právo vznést námitku:</strong> můžete vznést námitku proti zpracování</li>
            <li><strong>Právo odvolat souhlas:</strong> pokud je zpracování založeno na souhlasu</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Zabezpečení údajů</h2>
          <p className="text-gray-700 leading-relaxed">
            Přijímáme vhodná technická a organizační opatření k ochraně vašich osobních údajů 
            před neoprávněným přístupem, ztrátou nebo zneužitím. Využíváme šifrované připojení (HTTPS) 
            a bezpečné úložiště dat.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Sdílení údajů třetím stranám</h2>
          <p className="text-gray-700 leading-relaxed">
            Vaše osobní údaje nesdílíme s třetími stranami pro marketingové účely. 
            Údaje mohou být sdíleny pouze s poskytovateli služeb, kteří nám pomáhají 
            provozovat platformu (např. hosting), a to pouze v nezbytném rozsahu.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Cookies</h2>
          <p className="text-gray-700 leading-relaxed">
            Naše platforma používá pouze nezbytné technické cookies pro zajištění správného 
            fungování služby a přihlášení uživatelů. Nepoužíváme sledovací ani marketingové cookies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Kontakt</h2>
          <p className="text-gray-700 leading-relaxed">
            V případě dotazů ohledně zpracování osobních údajů nebo pro uplatnění vašich práv 
            nás můžete kontaktovat na e-mailové adrese uvedené v kontaktní sekci webu.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Dozorový úřad</h2>
          <p className="text-gray-700 leading-relaxed">
            Máte právo podat stížnost u dozorového úřadu, kterým je Úřad pro ochranu osobních údajů 
            (ÚOOÚ), Pplk. Sochora 27, 170 00 Praha 7, www.uoou.cz.
          </p>
        </section>

        <section className="border-t pt-6 mt-8">
          <p className="text-gray-500 text-sm">
            Poslední aktualizace: {new Date().toLocaleDateString('cs-CZ', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </section>
      </div>
    </div>
  );
}