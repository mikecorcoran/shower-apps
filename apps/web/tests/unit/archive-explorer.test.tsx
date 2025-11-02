import { render, screen } from '@testing-library/react';
import ArchiveExplorerClient from '@/tools/archive-explorer/client';

describe('ArchiveExplorerClient', () => {
  it('renders upload prompt initially', () => {
    render(<ArchiveExplorerClient />);
    expect(screen.getByText(/Drop or select an archive/i)).toBeInTheDocument();
  });
});
