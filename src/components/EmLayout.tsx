
import { Outlet } from 'react-router-dom';
import { GlobalDebugPanel } from './GlobalDebugPanel';
import { DebugProvider } from '../contexts/DebugContext';

function EmLayout() {

  

  return (
    <DebugProvider>

       
            <Outlet />




        <GlobalDebugPanel />

    </DebugProvider>
  );
}

export default EmLayout;
