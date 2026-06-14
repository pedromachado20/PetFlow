import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { Label } from "./label";

interface Props {
  value?: string | null;
  onChange: (base64: string | null) => void;
  label?: string;
}

function resizeToBase64(file: File, maxPx = 240, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxPx) { height = Math.round(height * maxPx / width); width = maxPx; }
        } else {
          if (height > maxPx) { width = Math.round(width * maxPx / height); height = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ value, onChange, label = "Foto" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. Use imagens até 5 MB.");
      return;
    }
    const base64 = await resizeToBase64(file);
    onChange(base64);
    e.target.value = "";
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative h-14 w-14 rounded-full overflow-hidden shrink-0 border-2 border-dashed border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {value ? (
            <img src={value} alt="Foto" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-secondary">
              <Camera className="h-5 w-5 text-muted-foreground" />
            </span>
          )}
        </button>

        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm text-primary hover:underline underline-offset-2 text-left"
          >
            {value ? "Alterar foto" : "Carregar foto"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive text-left"
            >
              <X className="h-3 w-3" /> Remover
            </button>
          )}
          <p className="text-xs text-muted-foreground">JPG, JPEG, PNG · máx 5 MB</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
