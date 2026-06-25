import {DisplayMode} from '@/types';

const MODES: {id: DisplayMode; label: string}[] = [
  {id: 'list', label: 'List'},
  {id: 'cards', label: 'Cards'},
];

interface Props {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

export default function DisplayModeBar({mode, onChange}: Props) {
  return (
    <div className="mode-bar" role="tablist" aria-label="Display mode">
      {MODES.map(item => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mode === item.id}
          className={mode === item.id ? 'mode-tab active' : 'mode-tab'}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
