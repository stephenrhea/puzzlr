import ReactDOM from 'react-dom/client';
import './index.css';
import './jigsaw-puzzle.css';
import { JigsawPuzzle } from './jigsaw-puzzle';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <div>
    <div className='jigsaw-table'>
      <JigsawPuzzle
      imageSrc="https://www.doi.gov/sites/doi.gov/files/uploads/grandcanyonnpyanlismall.jpg"
      rows={3}
      columns={3} />
    </div>
  </div>
);
