import { global as globalThis } from '../../../src/shared/global.ts';

import { Button } from './Button.jsx';
import { Form } from './Form.jsx';
import { Html } from './Html.jsx';
import { Pre } from './Pre.jsx';

globalThis.__TEMPLATE_COMPONENTS__ = { Button, Pre, Form, Html };
globalThis.storybookRenderer = 'react';
