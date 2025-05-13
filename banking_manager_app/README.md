# Banking Manager App

A modern web application for managing banking customers with offline support and real-time data synchronization.

## Features

- Add, edit, and delete customer records
- Search and filter customers
- Sort by various fields
- Pagination support
- Offline mode with data synchronization
- Customer statistics and analytics
- Responsive design
- Modern UI with Tailwind CSS

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- IndexedDB for offline storage

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/banking_manager_app.git
cd banking_manager_app
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── customers/
│   │   │   └── route.ts
│   │   └── health/
│   │       └── route.ts
│   ├── components/
│   │   ├── CustomerModal.tsx
│   │   ├── CustomerTable.tsx
│   │   ├── DeleteConfirmationModal.tsx
│   │   └── OfflineStatusIndicator.tsx
│   ├── types/
│   │   └── Customer.ts
│   ├── statistics/
│   │   └── page.tsx
│   ├── globals.css
│   └── page.tsx
├── public/
│   ├── edit.png
│   ├── delete.png
│   └── plus.png
└── package.json
```

## Features in Detail

### Customer Management
- Create new customer records with validation
- Edit existing customer information
- Delete customers with confirmation
- View customer details in a clean table format

### Search and Filter
- Search customers by name
- Sort by any column
- Paginated results for better performance

### Offline Support
- Continue working without internet connection
- Data automatically syncs when back online
- Clear offline status indication

### Statistics
- View total number of customers
- Analyze total and average balance
- Age distribution visualization
- Balance distribution visualization

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
