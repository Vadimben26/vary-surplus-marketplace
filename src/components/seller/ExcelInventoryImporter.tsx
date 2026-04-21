import { useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface ImportedLotItem {
  brand: string;
  name: string;
  category: string;
  gender: string;
  size: string;
  reference: string;
  quantity: number;
  retail_price: number;
  image_url: string;
}

interface Props {
  onImported: (items: ImportedLotItem[], summary: ImportSummary) => void;
  currentCount: number;
}

export interface ImportSummary {
  totalPieces: number;
  references: number;
  brands: string[];
  averageRetail: number;
}

const REQUIRED_HEADERS = [
  "Marque",
  "Nom",
  "Catégorie",
  "Genre",
  "Taille",
  "Référence",
  "Quantité",
  "Prix retail (€)",
];
const OPTIONAL_HEADERS = ["Photo (URL)"];
const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

const GENDER_MAP: Record<string, string> = {
  homme: "men", h: "men", men: "men", man: "men",
  femme: "women", f: "women", women: "women", woman: "women",
  enfant: "kids", kids: "kids", kid: "kids", child: "kids",
  mixte: "unisex", unisex: "unisex", u: "unisex",
};
const GENDER_LABELS = ["Homme", "Femme", "Enfant", "Mixte"];

const CATEGORY_MAP: Record<string, string> = {
  "vêtements": "clothing", "vetements": "clothing", "vêtement": "clothing", "vetement": "clothing", clothing: "clothing", "t-shirts": "clothing", "t-shirt": "clothing",
  sneakers: "sneakers", sneaker: "sneakers", chaussures: "sneakers", chaussure: "sneakers",
  accessoires: "accessories", accessoire: "accessories", accessories: "accessories",
};

export function downloadInventoryTemplate() {
  // Sheet 1 — Inventaire
  const headerRow = ALL_HEADERS;
  const exampleRow = ["Nike", "T-shirt col rond", "T-shirts", "Homme", "M", "NK-2024-001", 12, 29.9, ""];
  const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  ws["!cols"] = [
    { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 10 }, { wch: 8 },
    { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 30 },
  ];
  // Style example row in light gray (xlsx-js-style not bundled; use cell comments instead via 's' is best-effort)
  for (let c = 0; c < exampleRow.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 1, c });
    if (ws[addr]) {
      (ws[addr] as any).s = { fill: { fgColor: { rgb: "F3F4F6" } }, font: { color: { rgb: "9CA3AF" } } };
    }
  }

  // Sheet 2 — Instructions
  const instr = [
    ["INSTRUCTIONS — Template inventaire Vary"],
    [""],
    ["1. Ne modifiez pas les en-têtes de la ligne 1."],
    ["2. La ligne 2 (grise) est un exemple : remplacez-la ou supprimez-la."],
    ["3. Toutes les colonnes sauf 'Photo (URL)' sont obligatoires."],
    ["4. Genre : valeurs autorisées = Homme, Femme, Enfant, Mixte."],
    ["5. Quantité : nombre entier strictement supérieur à 0."],
    ["6. Prix retail (€) : nombre décimal > 0. Virgule ou point acceptés."],
    ["7. Photo (URL) : si renseignée, doit commencer par http:// ou https://."],
    [""],
    ["Formats de fichier acceptés : .xlsx, .xls, .csv"],
    ["Taille maximale : 5 MB"],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instr);
  wsInstr["!cols"] = [{ wch: 80 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventaire");
  XLSX.utils.book_append_sheet(wb, wsInstr, "INSTRUCTIONS");
  XLSX.writeFile(wb, "vary-inventaire-template.xlsx");
}

const ExcelInventoryImporter = ({ onImported, currentCount }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [structureError, setStructureError] = useState(false);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [preview, setPreview] = useState<ImportedLotItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setStructureError(false);
    setRowErrors([]);
    setSummary(null);
    setPreview([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const parseFile = useCallback(
    async (file: File) => {
      reset();
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 5 MB).");
        return;
      }
      const ext = file.name.toLowerCase().split(".").pop();
      if (!["xlsx", "xls", "csv"].includes(ext || "")) {
        toast.error("Format non supporté. Utilisez .xlsx, .xls ou .csv.");
        return;
      }
      setLoading(true);
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", raw: false });
        const sheetName = wb.SheetNames.find((n) => n.toLowerCase() !== "instructions") || wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        if (!sheet) {
          setStructureError(true);
          return;
        }
        const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false });
        if (aoa.length < 2) {
          setStructureError(true);
          return;
        }
        const headers = (aoa[0] as any[]).map((h) => String(h || "").trim());
        // Strict: headers must exactly match in order (case + accents sensitive)
        const headersOk =
          headers.length >= REQUIRED_HEADERS.length &&
          REQUIRED_HEADERS.every((h, i) => headers[i] === h);
        if (!headersOk) {
          setStructureError(true);
          return;
        }

        const dataRows = aoa.slice(1).filter((r) => r.some((c) => String(c).trim() !== ""));
        if (dataRows.length === 0) {
          setStructureError(true);
          return;
        }

        const errors: string[] = [];
        const items: ImportedLotItem[] = [];

        dataRows.forEach((row, idx) => {
          const lineNum = idx + 2; // +2 because row 1 is headers
          const [brand, name, catRaw, genderRaw, size, ref, qtyRaw, priceRaw, urlRaw] = row;
          const brandS = String(brand || "").trim();
          const nameS = String(name || "").trim();
          const catS = String(catRaw || "").trim();
          const genderS = String(genderRaw || "").trim();
          const sizeS = String(size || "").trim();
          const refS = String(ref || "").trim();
          const qtyS = String(qtyRaw ?? "").trim();
          const priceS = String(priceRaw ?? "").trim().replace(",", ".");
          const urlS = String(urlRaw || "").trim();

          if (!brandS) errors.push(`Ligne ${lineNum} — Marque manquante`);
          if (!nameS) errors.push(`Ligne ${lineNum} — Nom manquant`);
          if (!catS) errors.push(`Ligne ${lineNum} — Catégorie manquante`);
          if (!sizeS) errors.push(`Ligne ${lineNum} — Taille manquante`);
          if (!refS) errors.push(`Ligne ${lineNum} — Référence manquante`);

          const genderKey = genderS.toLowerCase();
          const genderNorm = GENDER_MAP[genderKey];
          if (!genderS) {
            errors.push(`Ligne ${lineNum} — Genre manquant`);
          } else if (!genderNorm) {
            errors.push(`Ligne ${lineNum} — Genre non reconnu (valeur : '${genderS}') → utilisez ${GENDER_LABELS.join(", ")}`);
          }

          const qty = parseInt(qtyS, 10);
          if (!qtyS) {
            errors.push(`Ligne ${lineNum} — Quantité manquante`);
          } else if (!Number.isInteger(qty) || qty <= 0 || String(qty) !== qtyS.replace(/\.0+$/, "")) {
            errors.push(`Ligne ${lineNum} — Quantité invalide (valeur : '${qtyS}')`);
          }

          const price = parseFloat(priceS);
          if (!priceS) {
            errors.push(`Ligne ${lineNum} — Prix retail manquant`);
          } else if (!Number.isFinite(price) || price <= 0) {
            errors.push(`Ligne ${lineNum} — Prix retail invalide (valeur : '${priceS}')`);
          }

          if (urlS && !/^https?:\/\//i.test(urlS)) {
            errors.push(`Ligne ${lineNum} — URL photo invalide (doit commencer par http:// ou https://)`);
          }

          items.push({
            brand: brandS,
            name: nameS,
            category: CATEGORY_MAP[catS.toLowerCase()] || catS.toLowerCase(),
            gender: genderNorm || "",
            size: sizeS,
            reference: refS,
            quantity: Number.isFinite(qty) && qty > 0 ? qty : 0,
            retail_price: Number.isFinite(price) && price > 0 ? price : 0,
            image_url: urlS,
          });
        });

        if (errors.length > 0) {
          setRowErrors(errors);
          return;
        }

        const totalPieces = items.reduce((s, it) => s + it.quantity, 0);
        const brandsSet = Array.from(new Set(items.map((it) => it.brand).filter(Boolean)));
        const totalRetailValue = items.reduce((s, it) => s + it.quantity * it.retail_price, 0);
        const avg = totalPieces > 0 ? totalRetailValue / totalPieces : 0;
        const sum: ImportSummary = {
          totalPieces,
          references: items.length,
          brands: brandsSet,
          averageRetail: avg,
        };
        setSummary(sum);
        setPreview(items.slice(0, 5));
        onImported(items, sum);
        toast.success(`${totalPieces} pièces importées — ${items.length} références — ${brandsSet.length} marques`);
      } catch (err: any) {
        console.error("Excel import error:", err);
        setStructureError(true);
      } finally {
        setLoading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onImported],
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
          {currentCount > 0 ? `${currentCount} référence(s) importée(s)` : "Aucun inventaire importé"}
        </span>
        <button
          type="button"
          onClick={downloadInventoryTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Télécharger le template
        </button>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50"
        }`}
      >
        {loading ? (
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        ) : (
          <Upload className="h-6 w-6 text-primary" />
        )}
        <p className="text-sm font-medium text-foreground">
          {loading ? "Validation en cours…" : "Glissez votre fichier ou cliquez pour parcourir"}
        </p>
        <p className="text-[11px] text-muted-foreground">.xlsx, .xls ou .csv — max 5 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFile}
          disabled={loading}
        />
      </label>

      {structureError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive font-medium">
              Fichier incompatible. Utilisez le template officiel Vary et remplissez tous les champs obligatoires.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadInventoryTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Télécharger le template
          </button>
        </div>
      )}

      {rowErrors.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive font-semibold">
              {rowErrors.length} erreur{rowErrors.length > 1 ? "s" : ""} détectée{rowErrors.length > 1 ? "s" : ""} dans votre fichier :
            </p>
          </div>
          <ul className="text-xs text-destructive space-y-1 max-h-40 overflow-y-auto pl-6 list-disc">
            {rowErrors.slice(0, 50).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {rowErrors.length > 50 && (
              <li className="italic">… et {rowErrors.length - 50} autre(s) erreur(s)</li>
            )}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadInventoryTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger le template
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Corriger mon fichier
            </button>
          </div>
        </div>
      )}

      {summary && !structureError && rowErrors.length === 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                {summary.totalPieces} pièces importées — {summary.references} références — {summary.brands.length} marques
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-muted-foreground hover:text-foreground p-1 rounded"
              aria-label="Réinitialiser"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Prix retail moyen pondéré : {summary.averageRetail.toFixed(2)} €
          </p>
          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-semibold">Marque</th>
                    <th className="text-left px-2 py-1.5 font-semibold">Nom</th>
                    <th className="text-left px-2 py-1.5 font-semibold">Taille</th>
                    <th className="text-left px-2 py-1.5 font-semibold">Qté</th>
                    <th className="text-left px-2 py-1.5 font-semibold">Prix €</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((it, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1">{it.brand}</td>
                      <td className="px-2 py-1">{it.name}</td>
                      <td className="px-2 py-1">{it.size}</td>
                      <td className="px-2 py-1">{it.quantity}</td>
                      <td className="px-2 py-1">{it.retail_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground italic">
            Aperçu des {preview.length} première(s) ligne(s). Réimporter remplacera les données.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExcelInventoryImporter;
