import { createBrowserRouter } from 'react-router';
import App from '@/App';

export default createBrowserRouter([
  {
    path: '/',
    Component: App,
    children: []
  },
]);