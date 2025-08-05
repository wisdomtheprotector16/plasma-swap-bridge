"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  DollarSign,
  User,
  Menu,
  Bell,
  Settings,
  Search,
} from "lucide-react";
import { TrueFlowHeaderRedirect } from "@/app/components/Header";

// Sample data for charts
const apyData = [
  { month: "Jan", value: 12 },
  { month: "Feb", value: 8 },
  { month: "Mar", value: 15 },
  { month: "Apr", value: 10 },
  { month: "May", value: 18 },
  { month: "Jun", value: 25 },
  { month: "Jul", value: 30 },
  { month: "Aug", value: 22 },
  { month: "Sep", value: 28 },
  { month: "Oct", value: 35 },
  { month: "Nov", value: 32 },
  { month: "Dec", value: 38 },
];

const valueData = [
  { time: "00:00", value: 1.0001 },
  { time: "04:00", value: 0.9998 },
  { time: "08:00", value: 1.0003 },
  { time: "12:00", value: 0.9995 },
  { time: "16:00", value: 1.0008 },
  { time: "20:00", value: 1.0002 },
  { time: "24:00", value: 1.0006 },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("Overview");
  const [isMobile, setIsMobile] = useState(false);

  const navigationItems = ["Overview", "Strategy", "Execute", "Account"];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <TrueFlowHeaderRedirect/>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:px-6">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Overview</h1>
          <p className="text-gray-600">
            Monitor your DeFi portfolio performance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Portfolio Value Card */}
          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm opacity-90">Portfolio Value</span>
                </div>
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold mb-2">$1,050.9</div>
              <div className="text-sm opacity-90">+2.4% from last month</div>
            </CardContent>
          </Card>

          {/* Total Backing Card */}
          <Card className="bg-white shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Total Backing</span>
                <div className="w-12 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { v: 1 },
                        { v: 2 },
                        { v: 1.5 },
                        { v: 3 },
                        { v: 2.5 },
                      ]}
                    >
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                $709.9M
              </div>
              <div className="text-sm text-gray-500">
                Increased 12% this week
              </div>
            </CardContent>
          </Card>

          {/* sUSDF Card */}
          <Card className="bg-white shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                  <span className="text-sm text-gray-600">sUSDF</span>
                </div>
                <div className="w-12 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { v: 1 },
                        { v: 2.5 },
                        { v: 2 },
                        { v: 3 },
                        { v: 2.8 },
                      ]}
                    >
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                286.32M
              </div>
              <div className="text-sm text-gray-500">Current supply</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* sUSDF APY Chart */}
          <Card className="bg-white shadow-md border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  sUSDF APY
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                >
                  38% APY
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={apyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <Bar dataKey="value" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="value"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      data={[apyData[apyData.length - 1]]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* sUSDF to USDT Value Chart */}
          <Card className="bg-white shadow-md border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">
                sUSDF-to-USDT Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={valueData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <YAxis
                      domain={["dataMin - 0.0005", "dataMax + 0.0005"]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      tickFormatter={(value) => value.toFixed(4)}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      fill="url(#colorGradient)"
                    />
                    <defs>
                      <linearGradient
                        id="colorGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-end mt-2">
                <span className="text-sm text-gray-500">$1.0006</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">TF</span>
              </div>
              <span className="text-sm text-gray-600">
                Copyright © 2024 by TrueFin. All rights reserved.
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <span className="sr-only">GitHub</span>
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </Button>
              <span className="text-gray-300">|</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <span className="sr-only">Twitter</span>
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </Button>
              <span className="text-gray-300">|</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <span className="sr-only">LinkedIn</span>
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </Button>
              <span className="text-gray-300">|</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <span className="sr-only">Discord</span>
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z" />
                </svg>
              </Button>
            </div>
          </div>
        </footer>
      </main>
    </main>
  );
};

export default Dashboard;
