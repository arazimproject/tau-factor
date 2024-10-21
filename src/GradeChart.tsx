import { BarChart, BarChartSeries } from "@mantine/charts"
import { Box, Chip, Paper, Table, Text } from "@mantine/core"
import { useState } from "react"
import { SemesterGrades } from "./typing"
import ColorHash from "color-hash"
import { formatSemester } from "./utilities"

const MOEDS = ["קובע", "א", "ב", "ג"]
const hash = new ColorHash()
const COLORS = new Array(1000).fill(0).map((_, i) => hash.hex(i.toString()))

const DEFAULT_VISIBLE_MOEDS = { 1: false, 2: false, 3: false }

const getDefaultVisibleGroups = (grades: Record<string, SemesterGrades[]>) => {
  const result: Record<string, boolean> = {}
  if (grades["00"]) {
    for (const key in grades) {
      if (key !== "00") {
        result[key] = false
      }
    }
  }
  return result
}

const formatSeriesName = (semester: string, group: string, moed: number) =>
  "סמסטר " +
  formatSemester(semester) +
  " | " +
  (group === "00" ? "כולם" : "קבוצה " + group) +
  " | " +
  MOEDS[moed]

interface ChartTooltipProps {
  label: string
  payload: Record<string, any>[] | undefined
}

const ChartTooltip = ({ label, payload }: ChartTooltipProps) => {
  if (!payload) return null

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md">
      <Text fw={500} mb={5} c="white">
        {label}
      </Text>
      {payload
        .sort((a, b) => b.value - a.value)
        .map((item: any) => (
          <Text key={item.name} c={item.color} fz="sm">
            {item.name}: {item.value}
          </Text>
        ))}
    </Paper>
  )
}

const GradeChart = ({
  grades,
}: {
  grades: Record<string, Record<string, SemesterGrades[]>>
}) => {
  const [visibleGroups, setVisibleGroups] = useState<
    Record<string, Record<string, boolean>>
  >({})
  const [visibleMoeds, setVisibleMoeds] = useState<
    Record<string, Record<string, boolean>>
  >({})

  if (!grades) {
    return <></>
  }

  // There's a 210 missing here, hacky approach to fix it.
  const limits = [0, 50, 60, 65, 70, 75, 80, 85, 90, 95, 100, 200]

  const series: BarChartSeries[] = []
  let index = 0
  for (const semester in grades) {
    for (const group in grades[semester]) {
      if (
        (visibleGroups[semester] ?? getDefaultVisibleGroups(grades[semester]))[
          group
        ] === false
      ) {
        continue
      }

      for (const grade of grades[semester][group]) {
        if (
          (visibleMoeds[semester] ?? DEFAULT_VISIBLE_MOEDS)[grade.moed] ===
          false
        ) {
          continue
        }

        series.push({
          name: formatSeriesName(semester, group, grade.moed),
          color: COLORS[index],
        })
        index++
      }
    }
  }

  return (
    <>
      <Table verticalSpacing={5}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>סמסטר</Table.Th>
            <Table.Th>ממוצע</Table.Th>
            <Table.Th>קבוצות</Table.Th>
            <Table.Th>מועדים</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Object.keys(grades)
            .sort()
            .reverse()
            .filter((year) => Object.keys(grades[year]).length !== 0)
            .map((semester, yearIndex) => {
              const maxMoed = Math.max(
                ...Object.values(grades[semester]).map((grade) =>
                  Math.max(...grade.map((v) => v.moed))
                )
              )
              const groups = Object.keys(grades[semester] ?? {}).sort()
              const mean = (grades[semester]["00"] ?? []).find(
                (x) => x.moed === 0
              )?.mean

              return (
                <Table.Tr key={yearIndex}>
                  <Table.Td>{formatSemester(semester)}</Table.Td>
                  <Table.Td>{mean !== 0 && mean}</Table.Td>
                  <Table.Td>
                    {groups.map((group, groupIndex) => (
                      <Chip
                        size="xs"
                        display="inline-block"
                        color="green"
                        checked={
                          (visibleGroups[semester] ??
                            getDefaultVisibleGroups(grades[semester]))[
                            group
                          ] !== false
                        }
                        onChange={(c) => {
                          if (!visibleGroups[semester]) {
                            visibleGroups[semester] = getDefaultVisibleGroups(
                              grades[semester]
                            )
                          }
                          visibleGroups[semester][group] = c
                          setVisibleGroups({ ...visibleGroups })
                        }}
                        key={groupIndex}
                        mx={5}
                      >
                        {group === "00" ? "כולם" : group}
                      </Chip>
                    ))}
                  </Table.Td>
                  <Table.Td>
                    {maxMoed > 0 &&
                      new Array(maxMoed + 1).fill(0).map((_, moed) => (
                        <Chip
                          size="xs"
                          display="inline-block"
                          color="green"
                          checked={
                            (visibleMoeds[semester] ?? DEFAULT_VISIBLE_MOEDS)[
                              moed
                            ] !== false
                          }
                          onChange={(c) => {
                            if (!visibleMoeds[semester]) {
                              visibleMoeds[semester] = {
                                ...DEFAULT_VISIBLE_MOEDS,
                              }
                            }
                            visibleMoeds[semester][moed] = c
                            setVisibleMoeds({ ...visibleMoeds })
                          }}
                          key={moed}
                          mx={5}
                        >
                          {MOEDS[moed]}
                        </Chip>
                      ))}
                  </Table.Td>
                </Table.Tr>
              )
            })}
        </Table.Tbody>
      </Table>
      <Box bg="#ffffff88" p="xs" my="xs" style={{ borderRadius: 10 }}>
        <BarChart
          type="stacked"
          tooltipProps={{
            content: ({ label, payload }) => (
              <ChartTooltip label={label} payload={payload} />
            ),
          }}
          mt="xs"
          h={600}
          data={limits.slice(0, -1).map((_, index) => {
            let topLimit = limits[index + 1] - 1
            if (topLimit === 99) {
              topLimit = 100
            } else if (topLimit === 199) {
              topLimit = 200
            }
            let range = `${limits[index]}-${topLimit}`
            if (range === "100-200") {
              range = "200-210"
            }
            const result: Record<string, any> = {
              range,
            }
            for (const year in grades) {
              for (const group in grades[year]) {
                for (const grade of grades[year][group]) {
                  result[formatSeriesName(year, group, grade.moed)] =
                    grade.distribution[index] ?? 0
                }
              }
            }

            return result
          })}
          dataKey="range"
          series={series}
        />
      </Box>
    </>
  )
}

export default GradeChart