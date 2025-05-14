\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{buildvision}[2025/05/13 BuildVision Report Class]

% Base class
\LoadClass[11pt,a4paper]{article}

% Required packages
\RequirePackage{geometry}
\RequirePackage{xcolor}
\RequirePackage{graphicx}
\RequirePackage{fancyhdr}
\RequirePackage{longtable}
\RequirePackage{array}
\RequirePackage{colortbl}
\RequirePackage{booktabs}
\RequirePackage{makecell}
\RequirePackage{enumitem}
\RequirePackage{titlesec}
\RequirePackage{hyperref}
\RequirePackage{fontspec}
\RequirePackage{setspace}
\RequirePackage{tikz}
\RequirePackage{tcolorbox}
\tcbuselibrary{skins,breakable}
\RequirePackage{etoolbox}
\RequirePackage{tabularx}
\RequirePackage{ltablex}
\RequirePackage{pdflscape}
\RequirePackage{ragged2e}
\RequirePackage{parskip}
\RequirePackage{microtype}
\RequirePackage{calc}
\RequirePackage{lastpage}

% Page geometry
\geometry{
  a4paper,
  top=2.5cm,
  bottom=2.5cm,
  left=2.5cm,
  right=2.5cm,
  headheight=1.5cm,
  footskip=1.5cm
}

% Define BuildVision colors
\definecolor{bvPrimary}{HTML}{4A3AFF}
\definecolor{bvPrimaryDark}{HTML}{3528BE}
\definecolor{bvPrimaryLight}{HTML}{ABBBFF}
\definecolor{bvPrimaryLighter}{HTML}{E8EBFF}
\definecolor{bvNeutralDark}{HTML}{2A2A2F}
\definecolor{bvNeutralMedium}{HTML}{8C8C92}
\definecolor{bvNeutralLight}{HTML}{F8F8F8}
\definecolor{bvNeutralBorder}{HTML}{C9CBCF}
\definecolor{bvNeutralBackground}{HTML}{FFFFFF}
\definecolor{bvSuccess}{HTML}{16DA7C}
\definecolor{bvWarning}{HTML}{FFCC17}
\definecolor{bvError}{HTML}{EC4343}
\definecolor{bvTextPrimary}{HTML}{1A1A1F}
\definecolor{bvTextSecondary}{HTML}{4F4F55}
\definecolor{bvTextTertiary}{HTML}{8C8C92}

% Set up fonts
\setmainfont{Inter}[
  Path = /Users/benjaminlyddane/Documents/Programming/BVReports/fonts/inter/Inter Desktop/,
  Extension = .otf,
  UprightFont = *-Regular,
  BoldFont = *-Bold,
  ItalicFont = *-Italic,
  BoldItalicFont = *-BoldItalic,
  Ligatures = TeX
]

\newfontfamily\interlight{Inter}[
  Path = /Users/benjaminlyddane/Documents/Programming/BVReports/fonts/inter/Inter Desktop/,
  Extension = .otf,
  UprightFont = *-Light,
  BoldFont = *-Medium,
  ItalicFont = *-LightItalic,
  BoldItalicFont = *-MediumItalic,
  Ligatures = TeX
]

\newfontfamily\intermedium{Inter}[
  Path = /Users/benjaminlyddane/Documents/Programming/BVReports/fonts/inter/Inter Desktop/,
  Extension = .otf,
  UprightFont = *-Medium,
  BoldFont = *-SemiBold,
  ItalicFont = *-MediumItalic,
  BoldItalicFont = *-SemiBoldItalic,
  Ligatures = TeX
]

\newfontfamily\intersemibold{Inter}[
  Path = /Users/benjaminlyddane/Documents/Programming/BVReports/fonts/inter/Inter Desktop/,
  Extension = .otf,
  UprightFont = *-SemiBold,
  BoldFont = *-Bold,
  ItalicFont = *-SemiBoldItalic,
  BoldItalicFont = *-BoldItalic,
  Ligatures = TeX
]

\newfontfamily\interbold{Inter}[
  Path = /Users/benjaminlyddane/Documents/Programming/BVReports/fonts/inter/Inter Desktop/,
  Extension = .otf,
  UprightFont = *-Bold,
  BoldFont = *-ExtraBold,
  ItalicFont = *-BoldItalic,
  BoldItalicFont = *-ExtraBoldItalic,
  Ligatures = TeX
]

% Set up hyperref
\hypersetup{
  colorlinks=true,
  linkcolor=bvPrimary,
  filecolor=bvPrimary,
  urlcolor=bvPrimary,
  citecolor=bvPrimary,
  pdftitle={BuildVision Report},
  pdfauthor={BuildVision},
  pdfsubject={BuildVision Project Report},
  pdfkeywords={buildvision, construction, report}
}

% Set up headers and footers
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyhead[C]{}
\fancyfoot[C]{\footnotesize\textcolor{bvTextTertiary}{Page \thepage\ of \pageref{LastPage}}}

% Title page command
\newcommand{\bvtitlepage}[5]{%
  % #1: Logo path
  % #2: Report title
  % #3: Subtitle
  % #4: Tagline
  % #5: Description
  \begin{titlepage}
    % Background color
    \pagecolor{bvNeutralLight}
    
    % Header bar
    \begin{tikzpicture}[remember picture, overlay]
      \fill[bvPrimary] (current page.north west) rectangle ([yshift=-15pt]current page.north east);
    \end{tikzpicture}
    
    % Logo with matching background
    \begin{tikzpicture}[remember picture, overlay]
      \node[anchor=north west, inner sep=0] at ([xshift=2.5cm, yshift=-3cm]current page.north west) {
        \begin{tcolorbox}[
          enhanced,
          width=8cm,
          height=3cm,
          colback=bvNeutralLight,
          colframe=bvNeutralLight,
          boxrule=0pt,
          arc=5pt,
          boxsep=0pt,
          left=0pt,
          right=0pt,
          top=0pt,
          bottom=0pt
        ]
          \includegraphics[width=7cm]{#1}
        \end{tcolorbox}
      };
    \end{tikzpicture}
    
    % Title and subtitle (removed BuildVision text, moved subtitle up)
    \vspace*{4cm}
    {\interlight\fontsize{24}{28}\selectfont\textcolor{bvTextPrimary}{#3}\par}
    
    % Decorative line
    \vspace{0.3cm}
    \noindent\textcolor{bvPrimary}{\rule{10cm}{2pt}}
    
    % Report title
    \vspace{0.7cm}
    {\intersemibold\fontsize{18}{22}\selectfont\textcolor{bvTextPrimary}{#2}\par}
    
    % Tagline
    \vspace{0.5cm}
    {\intermedium\fontsize{14}{18}\selectfont\textcolor{bvPrimaryDark}{#4}\par}
    
    % Description
    \vspace{0.2cm}
    {\fontsize{11}{15}\selectfont\textcolor{bvTextSecondary}{#5}\par}
    
    % Key Benefits section
    \vspace{0.7cm}
    \begin{tcolorbox}[
      enhanced,
      colback=white,
      colframe=bvNeutralBorder,
      arc=8pt,
      boxrule=1pt,
      left=12pt,
      right=12pt,
      top=10pt,
      bottom=10pt,
      width=\textwidth,
      leftrule=0pt,
      left skip=0pt,
      right skip=0pt
    ]
      \intersemibold\fontsize{14}{18}\selectfont\textcolor{bvPrimary}{Key Benefits}
      
      \vspace{0.2cm}
      \bvbenefit{T}{Save Time}
      \vspace{0.05cm}
      {\fontsize{10}{14}\selectfont\textcolor{bvTextSecondary}{Automate RFQs and reduce manual work by up to 50\%}\par}
      
      \vspace{0.2cm}
      \bvbenefit{\$}{Cut Costs}
      \vspace{0.05cm}
      {\fontsize{10}{14}\selectfont\textcolor{bvTextSecondary}{Negotiate directly with suppliers for better deals}\par}
      
      \vspace{0.2cm}
      \bvbenefit{→}{Streamlined Sourcing}
      \vspace{0.05cm}
      {\fontsize{10}{14}\selectfont\textcolor{bvTextSecondary}{Take BuildVision's structured data and send it to suppliers at \href{https://buildvision.io}{BuildVision.io}}\par}
    \end{tcolorbox}
    
    % Footer with BuildVision.io link
    \vfill
    {\fontsize{9}{11}\selectfont\textcolor{bvTextTertiary}{© Copyright \the\year. All Rights Reserved by BuildVision Inc. \href{https://buildvision.io}{buildvision.io}}\par}
  \end{titlepage}
  \pagecolor{white}
}

% Custom command for preparer information box
\newcommand{\bvpreparerinfo}[1]{%
  % #1: Preparer information
  \begin{tcolorbox}[
    enhanced,
    colback=white,
    colframe=bvNeutralBorder,
    arc=8pt,
    boxrule=1pt,
    left=15pt,
    right=15pt,
    top=10pt,
    bottom=10pt,
    width=\textwidth,
    leftrule=0pt,
    left skip=0pt,
    right skip=0pt
  ]
    {\fontsize{11}{15}\selectfont\textcolor{bvTextSecondary}{#1}\par}
  \end{tcolorbox}
}

% Section styling with proper spacing
\titleformat{\section}
  {\intersemibold\Large\color{bvPrimary}}
  {\thesection}
  {1em}
  {}
  [\vspace{0.1cm}\noindent\textcolor{bvPrimaryLighter}{\rule{\textwidth}{0.3cm}}]

\titleformat{\subsection}
  {\intersemibold\large\color{bvPrimaryDark}}
  {\thesubsection}
  {1em}
  {}

% Custom environments
\newenvironment{bvbox}[1][]{%
  \begin{tcolorbox}[
    enhanced,
    colback=white,
    colframe=bvNeutralBorder,
    arc=5pt,
    boxrule=1pt,
    leftrule=5pt,
    left=10pt,
    right=10pt,
    top=10pt,
    bottom=10pt,
    leftright skip=0pt,
    breakable,
    title=#1,
    coltitle=bvTextPrimary,
    fonttitle=\intersemibold,
    attach boxed title to top left={yshift=-2mm, xshift=5mm},
    boxed title style={colback=white, colframe=white}
  ]
}{%
  \end{tcolorbox}
}

% Custom command for key benefits
\newcommand{\bvbenefit}[2]{%
  % #1: Icon
  % #2: Benefit text
  \begin{tcolorbox}[
    enhanced,
    colback=white,
    colframe=bvNeutralBorder,
    arc=5pt,
    boxrule=1pt,
    left=10pt,
    right=10pt,
    top=5pt,
    bottom=5pt,
    width=\textwidth,
    leftrule=5pt,
    left skip=0pt,
    right skip=0pt,
    colbacklower=white,
    collower=bvTextPrimary,
    colupper=bvTextPrimary,
    fontupper=\normalsize,
    fontlower=\small,
    boxsep=5pt,
    before skip=5pt,
    after skip=5pt
  ]
    \begin{tikzpicture}
      \node[circle, fill=bvPrimaryLighter, minimum size=1.5em, inner sep=0] at (0,0) {\textcolor{bvPrimary}{#1}};
      \node[anchor=west] at (0.8,0) {\intersemibold\textcolor{bvTextPrimary}{#2}};
    \end{tikzpicture}
  \end{tcolorbox}
}

% Custom command for key benefits section
\newcommand{\bvbenefits}[3]{%
  % #1: Benefit 1 text
  % #2: Benefit 2 text
  % #3: Benefit 3 text
  \begin{tcolorbox}[
    enhanced,
    colback=white,
    colframe=bvNeutralBorder,
    arc=8pt,
    boxrule=1pt,
    left=15pt,
    right=15pt,
    top=15pt,
    bottom=15pt,
    width=\textwidth,
    leftrule=0pt,
    left skip=0pt,
    right skip=0pt
  ]
    \intersemibold\fontsize{14}{18}\selectfont\textcolor{bvPrimary}{Key Benefits}
    
    \vspace{0.5cm}
    \bvbenefit{T}{Save Time}
    \vspace{0.2cm}
    {\fontsize{11}{15}\selectfont\textcolor{bvTextSecondary}{Automate RFQs and reduce manual work by up to 50\%}\par}
    
    \vspace{0.5cm}
    \bvbenefit{\$}{Cut Costs}
    \vspace{0.2cm}
    {\fontsize{11}{15}\selectfont\textcolor{bvTextSecondary}{Negotiate directly with suppliers for better deals}\par}
    
    \vspace{0.5cm}
    \bvbenefit{→}{Streamlined Sourcing}
    \vspace{0.2cm}
    {\fontsize{11}{15}\selectfont\textcolor{bvTextSecondary}{Take BuildVision's structured data and send it to suppliers at \href{https://buildvision.io}{BuildVision.io}}\par}
  \end{tcolorbox}
}

% Custom table environment
\newenvironment{bvtable}[1][]{%
  \setlength{\LTpre}{0pt}
  \setlength{\LTpost}{0pt}
  \renewcommand{\arraystretch}{1.3}
  \begin{longtable}{#1}
    \rowcolor{bvPrimaryLight}
}{%
  \end{longtable}
}

% Custom command for info boxes
\newcommand{\bvinfobox}[2]{%
  % #1: Icon
  % #2: Title
  \begin{tcolorbox}[
    enhanced,
    colback=bvPrimaryLighter,
    colframe=bvPrimaryLighter,
    arc=0pt,
    boxrule=0pt,
    leftrule=5pt,
    left=10pt,
    right=10pt,
    top=10pt,
    bottom=10pt,
    leftright skip=0pt,
    breakable,
    left color=bvPrimary,
    right color=bvPrimaryLighter,
    middle=0.05
  ]
    {\intersemibold\fontsize{16}{20}\selectfont\textcolor{bvPrimary}{#1 #2}\par}
}

% Last page label for page counting
\AtEndDocument{\label{LastPage}}
