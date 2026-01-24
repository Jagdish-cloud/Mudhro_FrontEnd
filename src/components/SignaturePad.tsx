import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Upload, X } from 'lucide-react';

interface SignaturePadProps {
  value?: string; // base64 image string
  onChange?: (base64: string) => void;
  signerName?: string;
  onSignerNameChange?: (name: string) => void;
  disabled?: boolean;
  required?: boolean;
}

const SignaturePad = ({
  value,
  onChange,
  signerName,
  onSignerNameChange,
  disabled = false,
  required = false,
}: SignaturePadProps) => {
  const canvasRef = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setHasSignature(true);
      setUploadedImage(value);
    } else {
      setHasSignature(false);
      setUploadedImage(null);
    }
  }, [value]);

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
    setHasSignature(false);
    setUploadedImage(null);
    if (onChange) {
      onChange('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEnd = () => {
    if (canvasRef.current && !canvasRef.current.isEmpty()) {
      const dataURL = canvasRef.current.toDataURL('image/png');
      setHasSignature(true);
      setUploadedImage(null);
      if (onChange) {
        onChange(dataURL);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setHasSignature(true);
      if (canvasRef.current) {
        canvasRef.current.clear();
      }
      if (onChange) {
        onChange(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {onSignerNameChange && (
        <div className="space-y-2">
          <Label htmlFor="signer-name">
            Signer Name {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="signer-name"
            value={signerName || ''}
            onChange={(e) => onSignerNameChange(e.target.value)}
            placeholder="Enter your name"
            disabled={disabled}
            required={required}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>
          Signature {required && <span className="text-destructive">*</span>}
        </Label>
        
        {!hasSignature ? (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
            <div className="flex flex-col items-center justify-center space-y-4 min-h-[200px]">
              <p className="text-sm text-muted-foreground text-center">
                Draw your signature below or upload an image
              </p>
              
              <SignatureCanvas
                ref={canvasRef}
                canvasProps={{
                  className: 'border border-muted-foreground/25 rounded bg-white w-full max-w-md cursor-crosshair',
                  style: { width: '100%', height: '200px', touchAction: 'none' },
                }}
                onEnd={handleEnd}
                backgroundColor="white"
                penColor="black"
                dotSize={2}
                minWidth={2}
                maxWidth={3}
                throttle={0}
                velocityFilterWeight={0.7}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadClick}
                  disabled={disabled}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Signature
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative border-2 border-muted-foreground/25 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Signature Preview</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Clear and allow re-drawing
                    handleClear();
                    if (canvasRef.current) {
                      canvasRef.current.clear();
                    }
                  }}
                  disabled={disabled}
                >
                  <X className="h-4 w-4 mr-2" />
                  Edit Signature
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src={uploadedImage || value}
                alt="Signature"
                className="max-w-full max-h-[200px] object-contain"
              />
            </div>
            <div className="mt-2 flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUploadClick}
                disabled={disabled}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace with Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>

      {hasSignature && !uploadedImage && (
        <div className="text-xs text-muted-foreground">
          You can clear and redraw, or upload a signature image
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
