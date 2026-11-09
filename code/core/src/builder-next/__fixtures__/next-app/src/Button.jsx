import { greeting } from 'fixture-greeting';
import Image from 'next/image';

import logo from './logo.svg';

export function Button({ label }) {
  return (
    <button type="button" className="fixture-button" data-testid="button">
      <Image src={logo} alt="" width={16} height={16} />
      <span data-testid="label">{label}</span>
      <span data-testid="greeting">{greeting}</span>
    </button>
  );
}
