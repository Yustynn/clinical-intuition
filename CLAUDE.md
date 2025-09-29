# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clinical Intuition is a web-based prediction market game where users make binary yes/no predictions on real clinical trial outcomes. The project transforms complex clinical trial data into engaging, educational prediction cards that test users' intuition about medical research outcomes.

**Live Demo:** https://yustynn.github.io/clinical-intuition/

### Current Status: Phase 2 - Live Web Application ✅

The project has completed data processing and now features a fully functional React web application with:
- **Prediction Card Game**: Interactive cards with clinical trial questions
- **Real-time Feedback**: Immediate results showing actual study outcomes  
- **Privacy-First Design**: Hides p-values and results until after user predictions
- **Modern UI**: Light/dark theme toggle, animations, haptic feedback
- **Deployed**: Live on GitHub Pages with automated CI/CD

## Architecture Overview

### Frontend Web Application (`/web/`)
**Tech Stack:**
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite with HMR
- **Styling**: TailwindCSS with custom theme system
- **Animations**: Framer Motion for smooth UI transitions
- **Icons**: Lucide React
- **State Management**: Zustand (configured but minimal usage)
- **Routing**: React Router v7 (configured for future expansion)

**Key Components:**
- `PredictionCard.tsx`: Main game interface with question display and answer buttons
- `Landing.tsx`: Home page with game introduction
- `ModeToggle.tsx`: Light/dark theme switcher
- `Effects.tsx`: Visual effects (particles, score pops, gradient flashes)

### Data Processing Pipeline (`/retrieve-data/`)
**Completed Data Pipeline:**
1. **Raw Data Ingestion**: 5000+ clinical trials from ClinicalTrials.gov v2 API
2. **Study Validation**: Filters for completed trials with results and p-values  
3. **LLM Processing**: OpenAI GPT-4 converts clinical outcomes to layperson questions
4. **Card Generation**: 448 validated prediction cards with success labels
5. **Output**: JSON card data consumed by web application

**Key Notebooks:**
- `2025-09-29 Download Raw Studies.ipynb`: API data retrieval
- `2025-09-29 Explore.ipynb`: Data exploration and analysis
- `2025-09-30 ChatGPT and Final Card Creation.ipynb`: LLM-powered card generation

### Card Data Structure

Each prediction card contains:
```typescript
interface PredictionCard {
  study: {
    nct_id: string;           // ClinicalTrials.gov identifier
    title: string;            // Study title
    brief_description: string;
  };
  card_id: string;           // Unique card identifier
  front_details: {
    question: string;        // LLM-generated layperson question
    intervention_fragment: string;
    intervention_group_fragment: string;
    outcome_fragment: string;
    comparator_group_fragment: string;
    timeframe_fragment: string;
  };
  p_value: string;          // Statistical significance (hidden until answered)
  num_participants: number;
  success: boolean;         // True if p < 0.05
  conditions: string[];     // Medical conditions studied
  keywords: string[];       // Study keywords
}
```

## Development Commands

### Web Application Development
```bash
# Start development server
cd web && npm run dev

# Build for production  
cd web && npm run build

# Preview production build
cd web && npm run preview

# Lint code
cd web && npm run lint
```

### Data Processing
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run Jupyter notebooks
jupyter notebook retrieve-data/notebooks/
```

## Key Features & Implementation Details

### Privacy-First Design
- **P-value Hiding**: Statistical results hidden until after user makes prediction
- **Delayed Reveal**: Results show with 500ms delay after answering for better UX
- **Details Panel**: Shows study info but hides statistical measures until answered

### Theme System
- **Light Theme Default**: App initializes in light mode (user preference stored)
- **Retro Styling**: Custom theme system with amber color palette
- **CRT Effects**: Scanlines and phosphor glow for retro computer aesthetic

### Game Mechanics
- **Binary Predictions**: Users choose Yes/No for intervention success
- **Instant Feedback**: Shows correct/incorrect with visual effects
- **Streak Tracking**: Maintains user streak with visual indicators
- **Haptic Feedback**: Vibration patterns for mobile users (success/failure)

### Deployment & CI/CD
- **GitHub Pages**: Automated deployment via GitHub Actions
- **Build Pipeline**: TypeScript compilation → Vite build → Pages deploy
- **Base Path**: Configured for `/clinical-intuition/` subdirectory
- **No Jekyll**: `.nojekyll` file disables Jekyll processing

## Card Quality Standards

The LLM processing ensures cards meet quality criteria:
- **Readability**: Questions use layperson language, avoid medical jargon
- **Structure**: Consistent format "Did [intervention] improve [outcome] in [population] compared to [control] after [timeframe]?"
- **Accuracy**: Statistical significance correctly mapped (p < 0.05 = success)
- **Validation**: Pydantic models ensure question format consistency

## Future Enhancement Opportunities

**User Experience:**
- User accounts with persistent streak tracking
- Card difficulty ratings and adaptive selection
- Social features (sharing predictions, leaderboards)
- More card categories (pharmaceutical, device trials)

**Analytics & Learning:**
- User prediction accuracy tracking
- A/B testing for card presentation
- Analytics integration (Google Analytics planned)

**Content:**
- Expand beyond behavioral interventions
- Multi-language support for questions
- Expert commentary on surprising results

## Technical Debt & Maintenance

**Current Issues:**
- Large bundle size (1MB+ JS) - needs code splitting
- No backend API - all data static JSON
- Limited error handling for malformed card data
- No user authentication system

**Monitoring:**
- GitHub Actions for automated deployment
- No runtime monitoring or error tracking yet
- Performance monitoring needed for card loading

## API Integration Notes

### ClinicalTrials.gov v2 API
- **Endpoint**: `https://clinicaltrials.gov/api/v2/studies`
- **Filters Used**: `hasResults=true`, completed studies only
- **Rate Limits**: Handled with concurrent processing (100 workers)
- **Data Quality**: 34.7% of studies had usable p-values

### OpenAI Integration (Data Processing Only)
- **Model**: GPT-4-mini for cost efficiency  
- **Usage**: $1.34 for 448 cards (640k input, 588k output tokens)
- **Validation**: Pydantic models ensure response format consistency
- **Error Rate**: ~10% failure rate due to format validation

## Security & Privacy

- **No User Tracking**: No cookies or personal data collection
- **Static Deployment**: No server-side vulnerabilities
- **HTTPS Only**: Served over secure connection via GitHub Pages
- **Content Security**: All clinical data from public ClinicalTrials.gov

This project demonstrates the successful transformation of complex medical research data into an engaging, educational web experience that respects user privacy while providing valuable insights into clinical trial outcomes.