import type { FaceResult } from '../../types/screening';

type PadVerdict = FaceResult['padVerdict'];

const GLYPH: Record<PadVerdict, string> = {
  live: '●',
  spoof: '■',
  not_run: '○',
};

const LABEL: Record<PadVerdict, string> = {
  live: 'PAD: live',
  spoof: 'PAD: spoof',
  not_run: 'PAD: not run',
};

const COLOR_CLASS: Record<PadVerdict, string> = {
  live: 'text-clear',
  spoof: 'text-hold',
  not_run: 'text-steel-400',
};

interface PadBadgeProps {
  padVerdict: PadVerdict;
}

export function PadBadge({ padVerdict }: PadBadgeProps) {
  return (
    <span className={`flex items-center gap-1.5 text-scale-2 ${COLOR_CLASS[padVerdict]}`}>
      <span aria-hidden="true">{GLYPH[padVerdict]}</span>
      <span>{LABEL[padVerdict]}</span>
    </span>
  );
}
