import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Eraser, Check, X } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel: () => void;
  title: string;
}

const SignaturePad = ({ onSave, onCancel, title }: SignaturePadProps) => {
  const sigRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      try {
        // Use toDataURL directly instead of getTrimmedCanvas which has a broken dependency
        const canvas = sigRef.current.getCanvas();
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
      } catch (err) {
        console.error('Error saving signature:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/15 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="card-elevated w-full max-w-lg p-7">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold font-display">{title}</h3>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">Нарисуйте свою подпись мышкой или пальцем</p>

        <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-card mb-4">
          <SignatureCanvas
            ref={sigRef}
            canvasProps={{
              className: 'w-full',
              style: { width: '100%', height: '200px' },
            }}
            penColor="#ffffff"
            onBegin={() => setIsEmpty(false)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleClear} className="gap-2 rounded-xl flex-1">
            <Eraser className="w-4 h-4" />
            Очистить
          </Button>
          <Button onClick={handleSave} disabled={isEmpty} className="gap-2 rounded-xl flex-1">
            <Check className="w-4 h-4" />
            Подписать
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;
