'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Search } from "lucide-react";

interface LandBuyer {
  id: string;
  station: string;
  walk_time: string;
  type: string;
  price: string;
  family: string;
  occupation: string;
  age: string;
  land_area: string;
  building_area: string;
  parking: string;
  built_year: string;
  reason: string;
  ng: string;
  timing: string;
}

interface MansionBuyer {
  id: string;
  name: string;
  address: string;
  method: string;
  occupation: string;
  reason: string;
  timing: string;
  ng: string;
  family: string;
  age: string;
}

type Buyer = LandBuyer | MansionBuyer;

interface IntegratedData {
  generated_date: string;
  total_records: number;
  categories: {
    mansion: {
      total_records: number;
      total_properties: number;
      buyers: MansionBuyer[];
    };
    land: {
      total_records: number;
      total_stations: number;
      buyers: LandBuyer[];
    };
  };
}

export default function Home() {
  const [allData, setAllData] = useState<Buyer[]>([]);
  const [filteredData, setFilteredData] = useState<Buyer[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRecords: 0,
    mansionRecords: 0,
    mansionProperties: 0,
    landRecords: 0,
    landStations: 0,
  });
  const [displayStats, setDisplayStats] = useState({
    buyers: 0,
    properties: 0,
  });

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch("/integrated_data.json");
        const jsonData: IntegratedData = await response.json();
        
        // すべてのバイヤーデータを集約
        const allBuyers: Buyer[] = [];
        allBuyers.push(...jsonData.categories.mansion.buyers);
        allBuyers.push(...jsonData.categories.land.buyers);
        
        setAllData(allBuyers);
        setFilteredData(allBuyers);
        setStats({
          totalRecords: jsonData.total_records,
          mansionRecords: jsonData.categories.mansion.total_records,
          mansionProperties: jsonData.categories.mansion.total_properties,
          landRecords: jsonData.categories.land.total_records,
          landStations: jsonData.categories.land.total_stations,
        });
        setDisplayStats({
          buyers: jsonData.total_records,
          properties: jsonData.categories.mansion.total_properties,
        });
      } catch (error) {
        console.error("データ読み込みエラー:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // フィルター処理
  useEffect(() => {
    let filtered = allData;

    // カテゴリフィルター
    if (categoryFilter === "mansion") {
      filtered = filtered.filter(item => "name" in item);
    } else if (categoryFilter === "land") {
      filtered = filtered.filter(item => "station" in item);
    }

    // 検索フィルター
    if (searchFilter) {
      filtered = filtered.filter(item => {
        if ("name" in item) {
          return item.name.includes(searchFilter) || item.address.includes(searchFilter);
        } else {
          return item.station.includes(searchFilter);
        }
      });
    }

    setFilteredData(filtered);

    // 統計情報を更新
    const mansionCount = filtered.filter(item => "name" in item).length;
    const landCount = filtered.filter(item => "station" in item).length;
    
    setDisplayStats({
      buyers: categoryFilter === "mansion" ? mansionCount : categoryFilter === "land" ? landCount : filtered.length,
      properties: categoryFilter === "mansion" ? mansionCount : categoryFilter === "land" ? landCount : stats.mansionProperties,
    });
  }, [categoryFilter, searchFilter, allData, stats.mansionProperties]);

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];

    if (categoryFilter === "mansion" || (categoryFilter === "all" && filteredData.length > 0 && "name" in filteredData[0])) {
      headers = ["ID", "物件名", "住所", "購入方法", "職業", "購入理由", "購入時期", "NG条件", "家族構成", "年齢"];
      rows = filteredData
        .filter(item => "name" in item)
        .map(item => {
          const buyer = item as MansionBuyer;
          return [buyer.id, buyer.name, buyer.address, buyer.method, buyer.occupation, buyer.reason, buyer.timing, buyer.ng, buyer.family, buyer.age];
        });
    } else {
      headers = ["ID", "駅名", "徒歩時間", "物件タイプ", "予算", "家族構成", "職業", "年齢", "土地面積", "建物面積", "駐車場", "築年数", "購入理由", "NG条件", "購入時期"];
      rows = filteredData
        .filter(item => "station" in item)
        .map(item => {
          const buyer = item as LandBuyer;
          return [buyer.id, buyer.station, buyer.walk_time, buyer.type, buyer.price, buyer.family, buyer.occupation, buyer.age, buyer.land_area, buyer.building_area, buyer.parking, buyer.built_year, buyer.reason, buyer.ng, buyer.timing];
        });
    }

    const csv = [headers, ...rows].map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `buyers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isMansionData = filteredData.length > 0 && "name" in filteredData[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">近畿5府県 購入希望者データポータル</h1>
          <p className="text-gray-600">マンション・戸建て・土地の購入希望者情報を一元管理</p>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">総レコード数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalRecords.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">マンション購入希望者</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.mansionRecords.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.mansionProperties}物件</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">戸建て・土地購入希望者</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.landRecords.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.landStations}駅</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">検索結果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{filteredData.length.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">データ生成日</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-gray-900">2026年1月21日</div>
            </CardContent>
          </Card>
        </div>

        {/* フィルター */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>フィルター</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="mansion">マンション</SelectItem>
                    <SelectItem value="land">戸建て・土地</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isMansionData ? "物件名・住所で検索" : "駅名で検索"}
                </label>
                <Input
                  type="text"
                  placeholder={isMansionData ? "物件名または住所を入力" : "駅名を入力"}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleExportCSV} className="w-full" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  CSVエクスポート
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 検索結果 */}
        <Card>
          <CardHeader>
            <CardTitle>検索結果 ({filteredData.length}件)</CardTitle>
            <CardDescription>
              {categoryFilter === "mansion" && "マンション購入希望者"}
              {categoryFilter === "land" && "戸建て・土地購入希望者"}
              {categoryFilter === "all" && "全カテゴリ"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <p className="text-center text-gray-500 py-8">検索結果がありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {isMansionData ? (
                        <>
                          <th className="text-left py-2 px-2">物件名</th>
                          <th className="text-left py-2 px-2">住所</th>
                          <th className="text-left py-2 px-2">購入方法</th>
                          <th className="text-left py-2 px-2">職業</th>
                          <th className="text-left py-2 px-2">年齢</th>
                          <th className="text-left py-2 px-2">家族構成</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left py-2 px-2">駅名</th>
                          <th className="text-left py-2 px-2">徒歩時間</th>
                          <th className="text-left py-2 px-2">物件タイプ</th>
                          <th className="text-left py-2 px-2">予算</th>
                          <th className="text-left py-2 px-2">職業</th>
                          <th className="text-left py-2 px-2">年齢</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(0, 50).map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        {isMansionData && "name" in item ? (
                          <>
                            <td className="py-2 px-2">{item.name}</td>
                            <td className="py-2 px-2">{item.address}</td>
                            <td className="py-2 px-2">{item.method}</td>
                            <td className="py-2 px-2">{item.occupation}</td>
                            <td className="py-2 px-2">{item.age}</td>
                            <td className="py-2 px-2">{item.family}</td>
                          </>
                        ) : "station" in item ? (
                          <>
                            <td className="py-2 px-2">{item.station}</td>
                            <td className="py-2 px-2">{item.walk_time}</td>
                            <td className="py-2 px-2">{item.type}</td>
                            <td className="py-2 px-2">{item.price}</td>
                            <td className="py-2 px-2">{item.occupation}</td>
                            <td className="py-2 px-2">{item.age}</td>
                          </>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredData.length > 50 && (
                  <p className="text-center text-gray-500 py-4 text-xs">
                    最初の50件を表示しています（全{filteredData.length}件）
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
