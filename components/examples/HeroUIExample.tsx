'use client'

import { Button, Card, CardHeader, CardBody, CardFooter, Badge, Avatar } from '@heroui/react'

/**
 * Example component demonstrating HeroUI components
 * This proves HeroUI is installed and working correctly
 */
export function HeroUIExample() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h2 className="mb-4 text-2xl font-bold">HeroUI Components Demo</h2>
        <p className="text-muted-foreground">
          This page demonstrates that HeroUI is installed and working correctly.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-4">
        <h3 className="w-full text-xl font-semibold">Buttons</h3>
        <Button color="default">Default</Button>
        <Button color="primary">Primary</Button>
        <Button color="secondary">Secondary</Button>
        <Button color="success">Success</Button>
        <Button color="warning">Warning</Button>
        <Button color="danger">Danger</Button>
      </div>

      {/* Button Variants */}
      <div className="flex flex-wrap gap-4">
        <h3 className="w-full text-xl font-semibold">Button Variants</h3>
        <Button variant="solid" color="primary">
          Solid
        </Button>
        <Button variant="bordered" color="primary">
          Bordered
        </Button>
        <Button variant="light" color="primary">
          Light
        </Button>
        <Button variant="flat" color="primary">
          Flat
        </Button>
        <Button variant="faded" color="primary">
          Faded
        </Button>
        <Button variant="shadow" color="primary">
          Shadow
        </Button>
        <Button variant="ghost" color="primary">
          Ghost
        </Button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-4">
        <h3 className="w-full text-xl font-semibold">Badges</h3>
        <Badge content="5">
          <Avatar radius="md" src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
        </Badge>
        <Badge color="primary">Primary</Badge>
        <Badge color="secondary">Secondary</Badge>
        <Badge color="success">Success</Badge>
        <Badge color="warning">Warning</Badge>
        <Badge color="danger">Danger</Badge>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <h3 className="col-span-full text-xl font-semibold">Cards</h3>
        <Card>
          <CardHeader>
            <h4 className="text-lg font-bold">Default Card</h4>
          </CardHeader>
          <CardBody>
            <p>This is a basic HeroUI card component with header, body, and footer sections.</p>
          </CardBody>
          <CardFooter>
            <Button size="sm" color="primary">
              Action
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <h4 className="text-lg font-bold">Resource Example</h4>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-2">
              <Badge color="primary">Employment</Badge>
              <p className="text-sm">
                This card demonstrates how a resource might look in the app.
              </p>
            </div>
          </CardBody>
          <CardFooter>
            <Button size="sm" variant="flat" color="primary">
              View Details
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <h4 className="text-lg font-bold">With Avatar</h4>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3">
              <Avatar src="https://i.pravatar.cc/150?u=a04258114e29026702d" />
              <div>
                <p className="font-semibold">John Doe</p>
                <p className="text-sm text-muted-foreground">Community Resource</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 rounded-lg border border-green-500 bg-green-50 p-4 dark:bg-green-950">
        <p className="font-semibold text-green-800 dark:text-green-200">
          ✅ HeroUI is installed and working correctly!
        </p>
        <p className="mt-2 text-sm text-green-700 dark:text-green-300">
          All components are rendering properly with the HeroUI provider. You can now use HeroUI
          components throughout your application.
        </p>
      </div>
    </div>
  )
}
