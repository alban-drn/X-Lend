"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Wallet,
  ArrowRight,
  TrendingUp,
  Shield,
  ChevronDown,
  DollarSign,
  PieChart,
  Menu,
  X,
  Github,
  BookOpen,
  Mail,
  Clock,
  Calculator,
} from "lucide-react"

declare global {
  interface Window {
    ethereum?: any
  }
}

const NETWORKS = [
  { id: "ethereum", name: "Ethereum", symbol: "ETH", color: "#627EEA", chainId: "0x1" },
  { id: "mantle", name: "Mantle", symbol: "MNT", color: "#000000", chainId: "0x1388" },
  { id: "arbitrum", name: "Arbitrum", symbol: "ARB", color: "#28A0F0", chainId: "0xa4b1" },
  { id: "base", name: "Base", symbol: "ETH", color: "#0052FF", chainId: "0x2105" },
]

const LOAN_STATS = [
  { label: "Total Loans", value: "$24.7M", change: "+12.3%" },
  { label: "Average APY", value: "8.5%", change: "+0.2%" },
  { label: "Active Positions", value: "1,247", change: "+5.1%" },
  { label: "Liquidation Rate", value: "0.0%", change: "0%" },
]

const STORY_STEPS = [
  {
    id: "collateral",
    title: "Deposit Stock Collateral",
    description: "Use tokenized shares as collateral without liquidation risk",
    icon: <PieChart className="w-8 h-8" />,
    color: "#C8D9C4",
  },
  {
    id: "loan",
    title: "Borrow USDC",
    description: "Get instant USDC loans with fixed terms and predictable rates",
    icon: <DollarSign className="w-8 h-8" />,
    color: "#D4C0C9",
  },
  {
    id: "hedge",
    title: "Built-in Put Protection",
    description: "Automatic downside protection through embedded put options",
    icon: <Shield className="w-8 h-8" />,
    color: "#B8C5B8",
  },
  {
    id: "yield",
    title: "Earn on Remaining Capital",
    description: "Generate yield on your remaining capital while borrowing",
    icon: <TrendingUp className="w-8 h-8" />,
    color: "#E6D7E6",
  },
]

const LOAN_TERMS = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
  { days: 60, label: "60 days" },
  { days: 90, label: "90 days" },
]

const RECEIVE_TOKENS = [
  { id: "usdc", name: "USDC", symbol: "USDC", color: "#2775CA" },
  { id: "eth", name: "Ethereum", symbol: "ETH", color: "#627EEA" },
]

const RECEIVE_CHAINS = [
  { id: "mantle", name: "Mantle", symbol: "MNT", color: "#000000" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", color: "#627EEA" },
  { id: "arbitrum", name: "Arbitrum", symbol: "ARB", color: "#28A0F0" },
]

export default function VegaLoanHome() {
  // Page state management
  const [currentPage, setCurrentPage] = useState<"landing" | "dashboard">("landing")

  // Wallet states
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [account, setAccount] = useState("")
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0])
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Animation states (only for landing)
  const [scrollY, setScrollY] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [visibleSteps, setVisibleSteps] = useState<string[]>([])

  // Dashboard form states
  const [currentStep, setCurrentStep] = useState(0)
  const [shareSymbol, setShareSymbol] = useState("")
  const [sharePrice, setSharePrice] = useState(0)
  const [shareAmount, setShareAmount] = useState("")
  const [selectedToken, setSelectedToken] = useState(RECEIVE_TOKENS[0])
  const [selectedChain, setSelectedChain] = useState(RECEIVE_CHAINS[0])
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false)
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false)
  const [selectedTerm, setSelectedTerm] = useState(30)
  const [customTerm, setCustomTerm] = useState("")
  const [isCustomTerm, setIsCustomTerm] = useState(false)

  // Calculated values
  const [loanAmount, setLoanAmount] = useState(0)
  const [putPrice, setPutPrice] = useState(0)

  const logoRef = useRef<HTMLDivElement>(null)
  const stepRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
      // Check which story steps are visible (only on landing page)
      if (currentPage === "landing") {
        const newVisibleSteps: string[] = []
        STORY_STEPS.forEach((step) => {
          const element = stepRefs.current[step.id]
          if (element) {
            const rect = element.getBoundingClientRect()
            if (rect.top < window.innerHeight * 0.8) {
              newVisibleSteps.push(step.id)
            }
          }
        })
        setVisibleSteps(newVisibleSteps)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    if (currentPage === "landing") {
      window.addEventListener("scroll", handleScroll)
      window.addEventListener("mousemove", handleMouseMove)
    }

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [currentPage])

  // Calculate loan amount when share amount or price changes
  useEffect(() => {
    if (shareAmount && sharePrice) {
      const amount = Number.parseFloat(shareAmount) * sharePrice
      setLoanAmount(amount)
      // Simple put price calculation (BS + yield + fees)
      const term = isCustomTerm ? Number.parseInt(customTerm) : selectedTerm
      const putPriceCalc = amount * 0.05 + (amount * 0.08 * term) / 365 + amount * 0.02
      setPutPrice(putPriceCalc)
    }
  }, [shareAmount, sharePrice, selectedTerm, customTerm, isCustomTerm])

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask or Rabby wallet!")
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })
      if (accounts.length > 0) {
        setIsConnected(true)
        setAccount(accounts[0])
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setAccount("")
  }

  const switchNetwork = async (network: (typeof NETWORKS)[0]) => {
    if (typeof window.ethereum === "undefined") return

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainId }],
      })
      setSelectedNetwork(network)
      setIsNetworkDropdownOpen(false)
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to wallet
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: network.chainId,
                chainName: network.name,
                nativeCurrency: {
                  name: network.symbol,
                  symbol: network.symbol,
                  decimals: 18,
                },
                rpcUrls: ["https://rpc.ankr.com/" + network.id],
              },
            ],
          })
          setSelectedNetwork(network)
          setIsNetworkDropdownOpen(false)
        } catch (addError) {
          console.error("Error adding network:", addError)
        }
      } else {
        console.error("Error switching network:", error)
      }
    }
  }

  // Navigation functions
  const goToLanding = () => {
    setCurrentPage("landing")
    // Reset dashboard form
    setCurrentStep(0)
    setShareSymbol("")
    setSharePrice(0)
    setShareAmount("")
    setSelectedToken(RECEIVE_TOKENS[0])
    setSelectedChain(RECEIVE_CHAINS[0])
    setLoanAmount(0)
    setPutPrice(0)
    // Scroll to top
    window.scrollTo(0, 0)
  }

  const goToDashboard = () => {
    setCurrentPage("dashboard")
    window.scrollTo(0, 0)
  }

  // Dashboard form handlers
  const handleSymbolSubmit = () => {
    if (shareSymbol.trim()) {
      setSharePrice(100) // Fixed price for demo
      setCurrentStep(1)
    }
  }

  const handleAmountSubmit = () => {
    if (shareAmount.trim()) {
      setCurrentStep(2)
    }
  }

  const handleTokenChainSubmit = () => {
    setCurrentStep(3)
  }

  const handleTermSelect = (days: number) => {
    setSelectedTerm(days)
    setIsCustomTerm(false)
    setCurrentStep(4)
  }

  const handleCustomTermSubmit = () => {
    if (customTerm.trim()) {
      setIsCustomTerm(true)
      setCurrentStep(4)
    }
  }

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: "linear-gradient(135deg, #F7F2EB 0%, #F0EBE3 50%, #F7F2EB 100%)",
        color: "#333333",
      }}
    >
      {/* Floating Particles Background - Only on landing */}
      {currentPage === "landing" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-15"
              style={{
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                background: i % 3 === 0 ? "#C8D9C4" : i % 3 === 1 ? "#D4C0C9" : "#B8C5B8",
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `gentleFloat ${Math.random() * 20 + 15}s infinite linear`,
                transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
                transition: "transform 0.1s ease-out",
              }}
            />
          ))}
        </div>
      )}

      {/* Flowing Lines - Only on landing */}
      {currentPage === "landing" && (
        <div className="fixed inset-0 pointer-events-none">
          <svg className="w-full h-full opacity-10">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C8D9C4" />
                <stop offset="50%" stopColor="#D4C0C9" />
                <stop offset="100%" stopColor="#B8C5B8" />
              </linearGradient>
            </defs>
            <path
              d={`M 0,${100 + Math.sin(scrollY * 0.01) * 20} Q 400,${150 + Math.sin(scrollY * 0.008) * 30} 800,${120 + Math.sin(scrollY * 0.012) * 25} T 1600,${110 + Math.sin(scrollY * 0.015) * 20}`}
              stroke="url(#lineGradient)"
              strokeWidth="2"
              fill="none"
            />
            <path
              d={`M 0,${300 + Math.sin(scrollY * 0.015) * 25} Q 600,${250 + Math.sin(scrollY * 0.01) * 35} 1200,${280 + Math.sin(scrollY * 0.008) * 30} T 2400,${270 + Math.sin(scrollY * 0.012) * 25}`}
              stroke="url(#lineGradient)"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>
      )}

      {/* Header */}
      <header className="relative z-50 flex justify-between items-center p-6 md:p-8">
        {/* Logo - Always clickable to return to landing */}
        <div className="flex items-center space-x-4">
          <div
            onClick={goToLanding}
            className="relative cursor-pointer group"
            style={{
              transform: currentPage === "landing" ? `rotate(${scrollY * 0.1}deg)` : "rotate(0deg)",
              transition: "transform 0.1s ease-out",
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:translate-y-[-2px]"
              style={{
                background: "radial-gradient(circle at 30% 30%, #ffffff 0%, #1a1a1a 40%, #000000 100%)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 2px 8px rgba(255, 255, 255, 0.3)",
                animation: currentPage === "landing" ? "gentleRoll 8s infinite ease-in-out" : "none",
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{
                  background: "radial-gradient(circle, #ffffff 20%, transparent 21%)",
                  color: "#000000",
                }}
              >
                8
              </div>
            </div>
          </div>
          <div>
            <div
              className="text-2xl md:text-3xl font-bold cursor-pointer"
              onClick={goToLanding}
              style={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: "800",
                fontSize: "clamp(24px, 4vw, 32px)",
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #333333 0%, #C8D9C4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              VegaLoan
            </div>
            <div
              className="text-xs md:text-sm opacity-70 hidden md:block"
              style={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: "500",
                color: "#C8D9C4",
                letterSpacing: "0.05em",
              }}
            >
              {currentPage === "dashboard" ? "Lending Dashboard" : "Non-liquidable lending protocol"}
            </div>
          </div>
        </div>

        {/* Wallet + Network Selector */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Network Selector - Only visible when wallet is connected */}
          {isConnected && (
            <div className="relative">
              <button
                onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  borderColor: "rgba(200, 217, 196, 0.3)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedNetwork.color }} />
                <span
                  className="text-sm font-medium"
                  style={{
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    color: "#333333",
                  }}
                >
                  {selectedNetwork.name}
                </span>
                <ChevronDown className="w-4 h-4" style={{ color: "#333333" }} />
              </button>

              {/* Network Dropdown */}
              {isNetworkDropdownOpen && (
                <div
                  className="absolute top-full right-0 mt-2 w-48 rounded-xl border shadow-lg z-50"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderColor: "rgba(200, 217, 196, 0.3)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {NETWORKS.map((network) => (
                    <button
                      key={network.id}
                      onClick={() => switchNetwork(network)}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-sage-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: network.color }} />
                      <span
                        className="text-sm font-medium"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        {network.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wallet Connection */}
          {!isConnected ? (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="text-white font-semibold px-6 py-3 rounded-xl backdrop-blur-sm border shadow-lg transition-all duration-300 hover:scale-105"
              style={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                background: "linear-gradient(135deg, #C8D9C4 0%, #D4C0C9 100%)",
                borderColor: "rgba(200, 217, 196, 0.3)",
                boxShadow: "0 8px 32px rgba(200, 217, 196, 0.2)",
              }}
            >
              <Wallet className="w-4 h-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          ) : (
            <Button
              onClick={disconnectWallet}
              variant="outline"
              className="font-semibold px-6 py-3 rounded-xl backdrop-blur-sm bg-transparent transition-all duration-300 hover:scale-105"
              style={{
                borderColor: "#C8D9C4",
                color: "#333333",
                backgroundColor: "rgba(200, 217, 196, 0.1)",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              {account.slice(0, 6)}...{account.slice(-4)}
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ color: "#333333" }}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{
            background: "rgba(247, 242, 235, 0.95)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            {/* Mobile Network Selector - Only if connected */}
            {isConnected && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center" style={{ color: "#333333" }}>
                  Select Network
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {NETWORKS.map((network) => (
                    <button
                      key={network.id}
                      onClick={() => switchNetwork(network)}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-xl border transition-all ${
                        selectedNetwork.id === network.id ? "bg-sage-100" : ""
                      }`}
                      style={{
                        backgroundColor:
                          selectedNetwork.id === network.id ? "rgba(200, 217, 196, 0.2)" : "rgba(255, 255, 255, 0.8)",
                        borderColor: "rgba(200, 217, 196, 0.3)",
                      }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: network.color }} />
                      <span className="text-sm font-medium" style={{ color: "#333333" }}>
                        {network.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Wallet Connection */}
            {!isConnected ? (
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="text-white font-semibold px-8 py-4 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #C8D9C4 0%, #D4C0C9 100%)",
                }}
              >
                <Wallet className="w-4 h-4 mr-2" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            ) : (
              <Button
                onClick={disconnectWallet}
                variant="outline"
                className="font-semibold px-8 py-4 rounded-xl bg-transparent"
                style={{
                  borderColor: "#C8D9C4",
                  color: "#333333",
                }}
              >
                {account.slice(0, 6)}...{account.slice(-4)}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* LANDING PAGE */}
      {currentPage === "landing" && (
        <>
          {/* Hero Section */}
          <section className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] text-center px-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <div
                  className="inline-flex items-center px-4 py-2 rounded-full backdrop-blur-sm border mb-8"
                  style={{
                    backgroundColor: "rgba(200, 217, 196, 0.1)",
                    borderColor: "rgba(200, 217, 196, 0.3)",
                  }}
                >
                  <Shield className="w-4 h-4 mr-2" style={{ color: "#C8D9C4" }} />
                  <span
                    className="text-sm font-medium"
                    style={{
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      color: "#333333",
                      letterSpacing: "0.02em",
                    }}
                  >
                    Zero Liquidation Risk • Built-in Hedge Protection
                  </span>
                </div>
              </div>

              <h1
                className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: "800",
                  letterSpacing: "-0.04em",
                  color: "#333333",
                  lineHeight: "0.9",
                }}
              >
                Non‑liquidable lending
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #C8D9C4 0%, #D4C0C9 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  with tokenized shares
                </span>
              </h1>

              <p
                className="text-xl md:text-2xl mb-12 max-w-4xl mx-auto"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: "400",
                  color: "#666666",
                  lineHeight: "1.4",
                }}
              >
                Borrow USDC against stock collateral with built-in put protection. No liquidations, fixed terms,
                predictable yields.
              </p>

              {/* Live Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12 max-w-4xl mx-auto">
                {LOAN_STATS.map((stat, index) => (
                  <div
                    key={index}
                    className="backdrop-blur-sm rounded-xl p-4 md:p-6 border transition-all duration-300 hover:scale-105"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.6)",
                      borderColor: "rgba(200, 217, 196, 0.2)",
                      boxShadow: "0 8px 32px rgba(200, 217, 196, 0.1)",
                    }}
                  >
                    <div
                      className="text-xs md:text-sm mb-1 font-medium"
                      style={{
                        color: "#C8D9C4",
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {stat.label}
                    </div>
                    <div
                      className="text-lg md:text-2xl font-bold"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontWeight: "800",
                        color: "#333333",
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      className="text-xs font-medium"
                      style={{
                        color: stat.change.startsWith("+") ? "#10B981" : "#EF4444",
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      }}
                    >
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>
              {/* Pulsing CTA - Moved here */}
              <Button
                onClick={goToDashboard}
                size="lg"
                className="text-white px-12 py-6 text-xl font-bold rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 relative overflow-hidden"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: "700",
                  background: "linear-gradient(135deg, #C8D9C4 0%, #D4C0C9 100%)",
                  boxShadow: "0 20px 40px rgba(200, 217, 196, 0.3)",
                  animation: "gentlePulse 3s infinite",
                }}
              >
                <span className="relative z-10 flex items-center">
                  Start Lending
                  <ArrowRight className="w-6 h-6 ml-3" />
                </span>
              </Button>
            </div>
          </section>

          {/* Scroll-based Storytelling */}
          <section className="relative z-10 py-20 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-20">
                <h2
                  className="text-4xl md:text-5xl font-bold mb-6"
                  style={{
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontWeight: "700",
                    color: "#333333",
                    letterSpacing: "-0.02em",
                  }}
                >
                  How VegaLoan Works
                </h2>
                <p
                  className="text-lg md:text-xl max-w-3xl mx-auto"
                  style={{
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    color: "#666666",
                    lineHeight: "1.5",
                  }}
                >
                  A revolutionary lending protocol that eliminates liquidation risk through innovative financial
                  engineering
                </p>
              </div>

              <div className="space-y-32">
                {STORY_STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    ref={(el) => (stepRefs.current[step.id] = el)}
                    className={`flex flex-col ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-12 transition-all duration-1000 ${
                      visibleSteps.includes(step.id) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
                    }`}
                  >
                    {/* Illustration */}
                    <div className="flex-1 flex justify-center">
                      <div
                        className="w-64 h-64 md:w-80 md:h-80 rounded-3xl flex items-center justify-center backdrop-blur-sm border shadow-2xl transition-all duration-500 hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, ${step.color}20 0%, ${step.color}40 100%)`,
                          borderColor: `${step.color}40`,
                          boxShadow: `0 20px 60px ${step.color}30`,
                        }}
                      >
                        <div
                          className="w-24 h-24 rounded-2xl flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}CC 100%)`,
                            animation: visibleSteps.includes(step.id) ? `gentleRotate 10s infinite linear` : "none",
                          }}
                        >
                          <div style={{ color: "white" }}>{step.icon}</div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center md:text-left">
                      <div
                        className="inline-flex items-center px-3 py-1 rounded-full mb-4"
                        style={{
                          backgroundColor: `${step.color}20`,
                          color: step.color,
                        }}
                      >
                        <span
                          className="text-sm font-semibold"
                          style={{
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                            letterSpacing: "0.05em",
                          }}
                        >
                          STEP {index + 1}
                        </span>
                      </div>
                      <h3
                        className="text-3xl md:text-4xl font-bold mb-6"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          fontWeight: "700",
                          color: "#333333",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {step.title}
                      </h3>
                      <p
                        className="text-lg md:text-xl leading-relaxed"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#666666",
                          lineHeight: "1.6",
                        }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Dashboard Preview Section - Notional Style */}
          <section className="relative z-10 py-20 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2
                  className="text-4xl md:text-5xl font-bold mb-6"
                  style={{
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontWeight: "700",
                    color: "#333333",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Clean, Intuitive Dashboard
                </h2>
                <p
                  className="text-lg md:text-xl max-w-3xl mx-auto"
                  style={{
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    color: "#666666",
                    lineHeight: "1.5",
                  }}
                >
                  Monitor your positions, track yields, and manage loans with our Notional‑inspired interface
                </p>
              </div>

              {/* Dashboard Preview Card */}
              <Card
                className="max-w-4xl mx-auto p-8 md:p-12 border shadow-2xl"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderColor: "rgba(200, 217, 196, 0.2)",
                  backdropFilter: "blur(20px)",
                }}
              >
                {/* Key Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="text-center">
                    <div
                      className="text-4xl md:text-5xl font-bold mb-2"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontWeight: "800",
                        color: "#10B981",
                      }}
                    >
                      8.5%
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        color: "#C8D9C4",
                        letterSpacing: "0.05em",
                      }}
                    >
                      FIXED APY
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className="text-4xl md:text-5xl font-bold mb-2"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontWeight: "800",
                        color: "#333333",
                      }}
                    >
                      $50,000
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        color: "#C8D9C4",
                        letterSpacing: "0.05em",
                      }}
                    >
                      BORROWED AMOUNT
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className="text-4xl md:text-5xl font-bold mb-2"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontWeight: "800",
                        color: "#D4C0C9",
                      }}
                    >
                      $180
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        color: "#C8D9C4",
                        letterSpacing: "0.05em",
                      }}
                    >
                      PUT STRIKE PRICE
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex justify-center mb-8">
                  <div
                    className="inline-flex items-center px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      color: "#10B981",
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    <span
                      className="text-sm font-semibold"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Active Position
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div
                      className="flex justify-between items-center py-3 border-b"
                      style={{ borderColor: "rgba(200, 217, 196, 0.2)" }}
                    >
                      <span
                        className="font-medium"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#666666",
                        }}
                      >
                        Collateral
                      </span>
                      <span
                        className="font-semibold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        100 AAPL shares
                      </span>
                    </div>
                    <div
                      className="flex justify-between items-center py-3 border-b"
                      style={{ borderColor: "rgba(200, 217, 196, 0.2)" }}
                    >
                      <span
                        className="font-medium"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#666666",
                        }}
                      >
                        Loan Term
                      </span>
                      <span
                        className="font-semibold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        90 days
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span
                        className="font-medium"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#666666",
                        }}
                      >
                        Protection Level
                      </span>
                      <span
                        className="font-semibold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#10B981",
                        }}
                      >
                        95%
                      </span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div
                      className="text-lg font-semibold mb-4"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        color: "#333333",
                      }}
                    >
                      Yield Breakdown
                    </div>
                    <div
                      className="flex justify-between items-center py-3 border-b"
                      style={{ borderColor: "rgba(200, 217, 196, 0.2)" }}
                    >
                      <span
                        className="font-medium"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#666666",
                        }}
                      >
                        Base Interest
                      </span>
                      <span
                        className="font-semibold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#10B981",
                        }}
                      >
                        +6.5%
                      </span>
                    </div>
                    <div
                      className="flex justify-between items-center py-3 border-b"
                      style={{ borderColor: "rgba(200, 217, 196, 0.2)" }}
                    >
                      <span
                        className="font-medium"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#666666",
                        }}
                      >
                        Remaining Capital
                      </span>
                      <span
                        className="font-semibold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#10B981",
                        }}
                      >
                        +2.0%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span
                        className="font-semibold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        Total APY
                      </span>
                      <span
                        className="font-bold text-xl"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#10B981",
                        }}
                      >
                        8.5%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Footer */}
          <footer
            className="relative z-10 py-16 px-6"
            style={{
              backgroundColor: "#333333",
              color: "#ffffff",
            }}
          >
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-4 gap-8 mb-12">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: "radial-gradient(circle at 30% 30%, #ffffff 0%, #1a1a1a 40%, #000000 100%)",
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{
                          background: "radial-gradient(circle, #ffffff 20%, transparent 21%)",
                          color: "#000000",
                        }}
                      >
                        8
                      </div>
                    </div>
                    <div
                      className="text-xl font-bold"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        color: "#ffffff",
                      }}
                    >
                      VegaLoan
                    </div>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      color: "#cccccc",
                      lineHeight: "1.6",
                    }}
                  >
                    Non-liquidable lending protocol with built-in hedge protection for tokenized equity collateral.
                  </p>
                </div>

                <div>
                  <h3
                    className="font-semibold mb-4"
                    style={{
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      color: "#ffffff",
                    }}
                  >
                    Protocol
                  </h3>
                  <div className="space-y-2">
                    <a
                      href="#"
                      className="block text-sm hover:text-sage-300 transition-colors"
                      style={{ color: "#cccccc" }}
                    >
                      How it Works
                    </a>
                    <a
                      href="#"
                      className="block text-sm hover:text-sage-300 transition-colors"
                      style={{ color: "#cccccc" }}
                    >
                      Supported Assets
                    </a>
                    <a
                      href="#"
                      className="block text-sm hover:text-sage-300 transition-colors"
                      style={{ color: "#cccccc" }}
                    >
                      Risk Management
                    </a>
                  </div>
                </div>

                <div>
                  <h3
                    className="font-semibold mb-4"
                    style={{
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      color: "#ffffff",
                    }}
                  >
                    Resources
                  </h3>
                  <div className="space-y-2">
                    <a
                      href="#"
                      className="block text-sm hover:text-sage-300 transition-colors"
                      style={{ color: "#cccccc" }}
                    >
                      Documentation
                    </a>
                    <a
                      href="#"
                      className="block text-sm hover:text-sage-300 transition-colors"
                      style={{ color: "#cccccc" }}
                    >
                      Whitepaper
                    </a>
                    <a
                      href="#"
                      className="block text-sm hover:text-sage-300 transition-colors"
                      style={{ color: "#cccccc" }}
                    >
                      Security Audit
                    </a>
                  </div>
                </div>

                <div>
                  <h3
                    className="font-semibold mb-4"
                    style={{
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      color: "#ffffff",
                    }}
                  >
                    Connect
                  </h3>
                  <div className="flex space-x-4">
                    <a
                      href="#"
                      className="p-2 rounded-lg transition-colors hover:bg-gray-700"
                      style={{ color: "#C8D9C4" }}
                    >
                      <Github className="w-5 h-5" />
                    </a>
                    <a
                      href="#"
                      className="p-2 rounded-lg transition-colors hover:bg-gray-700"
                      style={{ color: "#C8D9C4" }}
                    >
                      <BookOpen className="w-5 h-5" />
                    </a>
                    <a
                      href="#"
                      className="p-2 rounded-lg transition-colors hover:bg-gray-700"
                      style={{ color: "#C8D9C4" }}
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t text-center" style={{ borderColor: "#555555" }}>
                <p
                  className="text-sm"
                  style={{
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    color: "#cccccc",
                  }}
                >
                  © 2024 VegaLoan Protocol. Built with ❤️ for the future of DeFi lending.
                </p>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* DASHBOARD PAGE */}
      {currentPage === "dashboard" && (
        <section className="relative z-10 py-20 px-6 min-h-screen">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2
                className="text-4xl md:text-5xl font-bold mb-6"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: "700",
                  color: "#333333",
                  letterSpacing: "-0.02em",
                }}
              >
                Create Your Loan
              </h2>
              <p
                className="text-lg md:text-xl max-w-3xl mx-auto"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  color: "#666666",
                  lineHeight: "1.5",
                }}
              >
                Follow these simple steps to get your non-liquidable loan
              </p>
            </div>

            <div className="space-y-8">
              {/* Step 1: Share Symbol */}
              <Card
                className="p-8 border transition-all duration-500 animate-slideIn"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  borderColor: "rgba(200, 217, 196, 0.3)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="flex items-center space-x-4 mb-6">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #C8D9C4 0%, #D4C0C9 100%)",
                    }}
                  >
                    <PieChart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3
                      className="text-2xl font-bold"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        color: "#333333",
                      }}
                    >
                      Step 1: Select Stock Symbol
                    </h3>
                    <p
                      className="text-sm"
                      style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        color: "#666666",
                      }}
                    >
                      Enter the stock symbol you want to use as collateral
                    </p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Input
                    type="text"
                    placeholder="Enter Share Symbol (ex: AAPL)"
                    value={shareSymbol}
                    onChange={(e) => setShareSymbol(e.target.value.toUpperCase())}
                    className="text-lg p-4 flex-1"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      borderColor: "rgba(200, 217, 196, 0.3)",
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    }}
                  />
                  <Button
                    onClick={handleSymbolSubmit}
                    disabled={!shareSymbol.trim()}
                    className="px-8 py-4 text-white font-semibold rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, #C8D9C4 0%, #D4C0C9 100%)",
                    }}
                  >
                    Next
                  </Button>
                </div>

                {/* Price Display */}
                {sharePrice > 0 && (
                  <div
                    className="mt-6 p-4 rounded-xl border animate-fadeIn"
                    style={{
                      backgroundColor: "rgba(200, 217, 196, 0.1)",
                      borderColor: "rgba(200, 217, 196, 0.3)",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className="font-medium"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        {shareSymbol} Current Price:
                      </span>
                      <span
                        className="text-2xl font-bold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#10B981",
                        }}
                      >
                        ${sharePrice}
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Step 2: Share Amount */}
              {currentStep >= 1 && (
                <Card
                  className="p-8 border transition-all duration-500 animate-slideIn"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderColor: "rgba(212, 192, 201, 0.3)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <div className="flex items-center space-x-4 mb-6">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #D4C0C9 0%, #C8D9C4 100%)",
                      }}
                    >
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-bold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        Step 2: Share Amount
                      </h3>
                      <p
                        className="text-sm"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#666666",
                        }}
                      >
                        How many shares do you want to use as collateral?
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Input
                      type="number"
                      placeholder="Enter number of shares"
                      value={shareAmount}
                      onChange={(e) => setShareAmount(e.target.value)}
                      className="text-lg p-4 flex-1"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        borderColor: "rgba(212, 192, 201, 0.3)",
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      }}
                    />
                    <Button
                      onClick={handleAmountSubmit}
                      disabled={!shareAmount.trim()}
                      className="px-8 py-4 text-white font-semibold rounded-xl"
                      style={{
                        background: "linear-gradient(135deg, #D4C0C9 0%, #C8D9C4 100%)",
                      }}
                    >
                      Next
                    </Button>
                  </div>

                  {loanAmount > 0 && (
                    <div
                      className="mt-6 p-4 rounded-xl border animate-fadeIn"
                      style={{
                        backgroundColor: "rgba(212, 192, 201, 0.1)",
                        borderColor: "rgba(212, 192, 201, 0.3)",
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className="font-medium"
                          style={{
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                            color: "#333333",
                          }}
                        >
                          Collateral Value:
                        </span>
                        <span
                          className="text-2xl font-bold"
                          style={{
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                            color: "#10B981",
                          }}
                        >
                          ${loanAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Step 3: Token & Chain Selection */}
              {currentStep >= 2 && (
                <Card
                  className="p-8 border transition-all duration-500 animate-slideIn"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderColor: "rgba(230, 215, 230, 0.3)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <div className="flex items-center space-x-4 mb-6">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #E6D7E6 0%, #C8D9C4 100%)",
                      }}
                    >
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-bold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        Step 3: Receive Token & Chain
                      </h3>
                      <p
                        className="text-sm"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#666666",
                        }}
                      >
                        Choose the token and chain to receive your loan
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Token Selector */}
                    <div className="relative">
                      <label
                        className="block text-sm font-medium mb-2"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        Receive Token
                      </label>
                      <button
                        onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                        className="w-full flex items-center justify-between space-x-2 px-4 py-3 rounded-xl border transition-all duration-300 hover:scale-105"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          borderColor: "rgba(230, 215, 230, 0.3)",
                          backdropFilter: "blur(20px)",
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedToken.color }} />
                          <span
                            className="text-sm font-medium"
                            style={{
                              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                              color: "#333333",
                            }}
                          >
                            {selectedToken.symbol}
                          </span>
                        </div>
                        <ChevronDown className="w-4 h-4" style={{ color: "#333333" }} />
                      </button>

                      {/* Token Dropdown */}
                      {isTokenDropdownOpen && (
                        <div
                          className="absolute top-full left-0 mt-2 w-full rounded-xl border shadow-lg z-50"
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderColor: "rgba(230, 215, 230, 0.3)",
                            backdropFilter: "blur(20px)",
                          }}
                        >
                          {RECEIVE_TOKENS.map((token) => (
                            <button
                              key={token.id}
                              onClick={() => {
                                setSelectedToken(token)
                                setIsTokenDropdownOpen(false)
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-sage-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                            >
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: token.color }} />
                              <span
                                className="text-sm font-medium"
                                style={{
                                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                                  color: "#333333",
                                }}
                              >
                                {token.symbol}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chain Selector */}
                    <div className="relative">
                      <label
                        className="block text-sm font-medium mb-2"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        Receive Chain
                      </label>
                      <button
                        onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
                        className="w-full flex items-center justify-between space-x-2 px-4 py-3 rounded-xl border transition-all duration-300 hover:scale-105"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          borderColor: "rgba(230, 215, 230, 0.3)",
                          backdropFilter: "blur(20px)",
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedChain.color }} />
                          <span
                            className="text-sm font-medium"
                            style={{
                              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                              color: "#333333",
                            }}
                          >
                            {selectedChain.name}
                          </span>
                        </div>
                        <ChevronDown className="w-4 h-4" style={{ color: "#333333" }} />
                      </button>

                      {/* Chain Dropdown */}
                      {isChainDropdownOpen && (
                        <div
                          className="absolute top-full left-0 mt-2 w-full rounded-xl border shadow-lg z-50"
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderColor: "rgba(230, 215, 230, 0.3)",
                            backdropFilter: "blur(20px)",
                          }}
                        >
                          {RECEIVE_CHAINS.map((chain) => (
                            <button
                              key={chain.id}
                              onClick={() => {
                                setSelectedChain(chain)
                                setIsChainDropdownOpen(false)
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-sage-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                            >
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chain.color }} />
                              <span
                                className="text-sm font-medium"
                                style={{
                                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                                  color: "#333333",
                                }}
                              >
                                {chain.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleTokenChainSubmit}
                    className="w-full py-4 text-white font-semibold rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, #E6D7E6 0%, #C8D9C4 100%)",
                    }}
                  >
                    Continue
                  </Button>
                </Card>
              )}

              {/* Step 4: Loan Term */}
              {currentStep >= 3 && (
                <Card
                  className="p-8 border transition-all duration-500 animate-slideIn"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderColor: "rgba(184, 197, 184, 0.3)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <div className="flex items-center space-x-4 mb-6">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #B8C5B8 0%, #D4C0C9 100%)",
                      }}
                    >
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-bold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        Step 4: Loan Term
                      </h3>
                      <p
                        className="text-sm"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#666666",
                        }}
                      >
                        Select the duration of your loan
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                    {LOAN_TERMS.map((term) => (
                      <button
                        key={term.days}
                        onClick={() => handleTermSelect(term.days)}
                        className={`p-3 rounded-xl border transition-all duration-300 hover:scale-105 ${
                          selectedTerm === term.days && !isCustomTerm ? "ring-2 ring-sage-400" : ""
                        }`}
                        style={{
                          backgroundColor:
                            selectedTerm === term.days && !isCustomTerm
                              ? "rgba(200, 217, 196, 0.2)"
                              : "rgba(255, 255, 255, 0.9)",
                          borderColor: "rgba(184, 197, 184, 0.3)",
                        }}
                      >
                        <div
                          className="text-sm font-semibold"
                          style={{
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                            color: "#333333",
                          }}
                        >
                          {term.label}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex space-x-4">
                    <Input
                      type="number"
                      placeholder="Custom days"
                      value={customTerm}
                      onChange={(e) => setCustomTerm(e.target.value)}
                      className="text-lg p-4 flex-1"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        borderColor: "rgba(184, 197, 184, 0.3)",
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      }}
                    />
                    <Button
                      onClick={handleCustomTermSubmit}
                      disabled={!customTerm.trim()}
                      className="px-8 py-4 text-white font-semibold rounded-xl"
                      style={{
                        background: "linear-gradient(135deg, #B8C5B8 0%, #D4C0C9 100%)",
                      }}
                    >
                      Custom
                    </Button>
                  </div>
                </Card>
              )}

              {/* Step 5: Loan Summary */}
              {currentStep >= 4 && (
                <Card
                  className="p-8 border transition-all duration-500 animate-slideIn"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderColor: "rgba(200, 217, 196, 0.3)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <div className="flex items-center space-x-4 mb-6">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #C8D9C4 0%, #D4C0C9 100%)",
                      }}
                    >
                      <Calculator className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-bold"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        Step 5: Loan Summary
                      </h3>
                      <p
                        className="text-sm"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#666666",
                        }}
                      >
                        Review your loan details and estimated costs
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div
                      className="p-6 rounded-xl border"
                      style={{
                        backgroundColor: "rgba(200, 217, 196, 0.1)",
                        borderColor: "rgba(200, 217, 196, 0.3)",
                      }}
                    >
                      <h4
                        className="text-lg font-semibold mb-4"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        Loan Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span style={{ color: "#666666" }}>Collateral:</span>
                          <span style={{ color: "#333333", fontWeight: "600" }}>
                            {shareAmount} {shareSymbol} shares
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "#666666" }}>Receive Token:</span>
                          <span style={{ color: "#333333", fontWeight: "600" }}>{selectedToken.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "#666666" }}>Receive Chain:</span>
                          <span style={{ color: "#333333", fontWeight: "600" }}>{selectedChain.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "#666666" }}>Loan Term:</span>
                          <span style={{ color: "#333333", fontWeight: "600" }}>
                            {isCustomTerm ? customTerm : selectedTerm} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "#666666" }}>Estimated Loan:</span>
                          <span style={{ color: "#10B981", fontWeight: "700", fontSize: "18px" }}>
                            ${(loanAmount * 0.7).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="p-6 rounded-xl border"
                      style={{
                        backgroundColor: "rgba(212, 192, 201, 0.1)",
                        borderColor: "rgba(212, 192, 201, 0.3)",
                      }}
                    >
                      <h4
                        className="text-lg font-semibold mb-4"
                        style={{
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#333333",
                        }}
                      >
                        Protection Costs
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span style={{ color: "#666666" }}>Put Premium:</span>
                          <span style={{ color: "#333333", fontWeight: "600" }}>${(putPrice * 0.6).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "#666666" }}>Interest:</span>
                          <span style={{ color: "#333333", fontWeight: "600" }}>${(putPrice * 0.3).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "#666666" }}>Fees:</span>
                          <span style={{ color: "#333333", fontWeight: "600" }}>${(putPrice * 0.1).toFixed(2)}</span>
                        </div>
                        <div
                          className="flex justify-between border-t pt-2"
                          style={{ borderColor: "rgba(212, 192, 201, 0.3)" }}
                        >
                          <span style={{ color: "#333333", fontWeight: "600" }}>Total Cost:</span>
                          <span style={{ color: "#EF4444", fontWeight: "700", fontSize: "18px" }}>
                            ${putPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-8 py-4 text-lg font-bold text-white rounded-xl transition-all duration-300 hover:scale-105"
                    disabled={!isConnected}
                    style={{
                      background: "linear-gradient(135deg, #C8D9C4 0%, #D4C0C9 100%)",
                      boxShadow: "0 8px 32px rgba(200, 217, 196, 0.3)",
                    }}
                  >
                    {isConnected ? "Create Loan" : "Connect Wallet to Continue"}
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

      <style jsx>{`
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(90deg); }
          50% { transform: translateY(-6px) rotate(180deg); }
          75% { transform: translateY(-3px) rotate(270deg); }
        }

        @keyframes gentleRoll {
          0%, 100% { transform: rotate(0deg) translateX(0px); }
          25% { transform: rotate(90deg) translateX(2px); }
          50% { transform: rotate(180deg) translateX(0px); }
          75% { transform: rotate(270deg) translateX(-2px); }
        }

        @keyframes gentleRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes gentlePulse {
          0%, 100% { box-shadow: 0 20px 40px rgba(200, 217, 196, 0.3); }
          50% { box-shadow: 0 25px 50px rgba(200, 217, 196, 0.4); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.6s ease-out;
        }
      `}</style>
    </div>
  )
}
