# Clinical Intuition 🎯

> Test your intuition about clinical trial outcomes with real research data

**[🚀 Play Now](https://yustynn.github.io/clinical-intuition/)**

Clinical Intuition is an interactive web game that challenges users to predict the outcomes of real clinical trials. Built with data from 5,000+ completed studies, it transforms complex medical research into engaging yes/no prediction cards.

![Screenshot of Clinical Intuition game interface showing a prediction card]

## 🎮 How It Works

1. **Read the Question**: Each card presents a clinical trial scenario in simple language
2. **Make Your Prediction**: Will the intervention work? Choose Yes or No
3. **See the Results**: Discover what actually happened in the study
4. **Build Your Streak**: Track your accuracy across multiple predictions

## ✨ Features

- **🔬 Real Data**: Questions generated from actual completed clinical trials
- **🎯 Privacy-First**: No tracking, no cookies, no personal data collection  
- **📱 Mobile-Friendly**: Haptic feedback and responsive design
- **🌙 Light/Dark Themes**: Retro-inspired interface with CRT effects
- **⚡ Fast & Lightweight**: Built with modern web technologies
- **🎨 Smooth Animations**: Engaging visual feedback and transitions

## 🏗️ Architecture

### Frontend
- **React 19** + **TypeScript** for type-safe development
- **Vite** for fast development and optimized builds
- **TailwindCSS** for utility-first styling
- **Framer Motion** for smooth animations
- **Lucide React** for consistent iconography

### Data Processing
- **Python** + **Jupyter** notebooks for data analysis
- **OpenAI GPT-4** for converting clinical language to plain English
- **ClinicalTrials.gov API** for source data (5,000+ studies processed)
- **Pydantic** models for data validation and quality assurance

### Deployment
- **GitHub Pages** for static hosting
- **GitHub Actions** for automated CI/CD
- **TypeScript compilation** → **Vite build** → **Deploy**

## 📊 Data & Quality

- **448 validated prediction cards** from completed clinical trials
- **34.7% of studies** had usable statistical significance data (p-values)
- **Questions validated** for readability and accuracy by LLM processing
- **Privacy-compliant**: P-values hidden until after user makes prediction

## 🚀 Quick Start

### Playing the Game
Simply visit **[yustynn.github.io/clinical-intuition](https://yustynn.github.io/clinical-intuition)** - no installation required!

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Yustynn/clinical-intuition.git
cd clinical-intuition

# Install web app dependencies
cd web
npm install

# Start development server
npm run dev
```

### Data Processing Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Launch Jupyter for data exploration
jupyter notebook retrieve-data/notebooks/
```

## 🗂️ Project Structure

```
├── web/                          # React web application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── features/           # Feature-specific components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # Utility functions
│   ├── cards.json              # Prediction card data
│   └── dist/                   # Built application
├── retrieve-data/               # Data processing pipeline
│   ├── notebooks/              # Jupyter analysis notebooks
│   ├── src/                    # Python data processing code
│   └── data/                   # Raw and processed data
├── .github/workflows/          # GitHub Actions CI/CD
└── README.md
```

## 🛠️ Available Scripts

### Web Development
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build  
npm run lint      # Run ESLint
```

### Data Processing
```bash
jupyter notebook  # Launch data notebooks
python src/extract_valid_studies.py  # Process raw study data
```

## 🤝 Contributing

We welcome contributions! Here are some ways to get involved:

- **🐛 Report bugs** via GitHub Issues
- **💡 Suggest features** for enhancing the game experience  
- **📝 Improve questions** by reviewing card quality
- **🔧 Submit PRs** for bug fixes or new features
- **📊 Add data** from additional clinical trial sources

### Development Guidelines
- Use TypeScript for all new code
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation for significant changes

## 📈 Roadmap

### Near Term
- [ ] **Analytics Integration**: User behavior insights
- [ ] **Performance Optimization**: Code splitting and lazy loading
- [ ] **Accessibility**: WCAG compliance improvements
- [ ] **More Card Categories**: Pharmaceutical and device trials

### Future Vision  
- [ ] **User Accounts**: Persistent streak tracking
- [ ] **Social Features**: Leaderboards and sharing
- [ ] **Expert Commentary**: Insights on surprising results
- [ ] **Multi-language Support**: Reach global audiences
- [ ] **Mobile App**: Native iOS/Android experience

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ClinicalTrials.gov** for providing open access to clinical trial data
- **OpenAI** for LLM processing capabilities that make complex research accessible
- **React and Vite communities** for excellent developer tools
- **All clinical researchers** whose work makes this educational tool possible

## 📞 Contact

- **GitHub Issues**: For bugs and feature requests
- **Website**: [yustynn.github.io/clinical-intuition](https://yustynn.github.io/clinical-intuition)

---

*Making clinical research insights accessible, one prediction at a time.* 🎯✨