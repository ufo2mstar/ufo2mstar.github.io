---
layout: post
comments: true
title:  "Primer: Getting up and running with Ruby"
date: January 9, 2015, 7:08 PM
categories: [Tutorial]
tags: [Ruby, OOP, CS]
excerpt: Yay! another Ruby tutorial.. Ruby is one of the more simpler and elegant programming languages to get up and running as quickly as possible!
mathjax: false
---
* content
{:toc}



  
**_Still in progress..._**

In my opinion these are some things that feel would actually be beneficial, in contrast to / on top of the suggested group programming exercises.. Here are some topics to cover in:

Analogy:
Programs are like magic boxes.. 

Think of 
*RUBY*

being an expression-oriented language, like most scripting languages, produces values upon the execution of every line..

The simplicity and brevity of the language can be encapsulated as follows.

Consider the snippet:
```ruby
def five
  5
end
five
```
output >> 5 => nil

```ruby
print five()
```
output >> 5 => nil

## Remember:

> last line of a method (or function) is *return*ed**_ _**by **_default_**

> and the nil above is what is returned from the print method

**irb**

once Ruby is installed on your machine, bust out IRB (Interactive Ruby Shell) and have fun

```cmd
ie: *WinKey+R > cmd > irb*
```
Things you should know..

## **Variables **and Assignment

1. Almost anything is a variable (anything other than Constants, symbols and numbers)
```ruby
 		just say * a = something*
```
2. Parallel Assignment
```ruby
    1. *one,two,three = 1,2,3*
```
3. Constants

4. Variadic Methods and the * operator

    2. basically bulk arguments passing

## **Basic **Data and Datatypes

1. Booleans 
    1. and, &&
    2. or, ||
    3. TRUEs
    4. FALSEs

2. **strings**
    5. 'these' and "these"
    
        1. concat '+' and other prebuilt methods for string manipulation like
            1. upcase
            2. downcase
            3. capitalize

etc..

    6. printing
        1. print
        2. puts
        3. p
        4. warn

etc..

    7. String Interpolation
```ruby
a=1+2 or a = nil

"1+2= #{ a || 1+2 }"

>> 1+2=3
```

3. **numbers**

    8. ints and floats

        6. all arithmetic operators: 

+,-,*,/,raised to the power **,<,>, etc..

4. **Enumerables**

    9. each

    10. count

    11. select

    12. map

    13. collect,

etc…
```ruby
* trick --  [a,b].map(&:upcase)
```

5. **symbols**
```ruby
:i_am_a_symbol
:symbols_begin_with_a_colon_and_are_one_word
```

6. **nil**
```ruby
nil type
```

## **Data **Structures

1. array [ ]
```ruby
a=['things', "like" , :this ,123]

a[2] 
```
>> "like"

2. hash { }
```ruby
h={:one => "this" , or: :symbol, also: 12 }

h[:also] = 12

h[:does_not_exist]=nil
```

3. range (iterables)
```ruby
    1..10  # one to ten
    1...10  # one to nine
```
## Blocks, **Procs **and Lambdas

1. do..end

    1. same as {<block>}

    2. Blocks and Yields

2. if..else..end

if 1<3

  print 'lesser than'

elsif 1==3

  puts "equal"

else

  p "greater than"

end

* also one liners 

print "yes" if 1<3

3. while..end

i=-5

while i<=5

  p i; i+=1

end

4. case

a="something”

a=case a

when "b" then “b”

when nil

  "nil"

else

  "this is default"

end

>> "this is default"

5. proc

add = -> a,b {a+b}

add[1,3] or add.call(1,3)

>> 4

More Advanced Topics: 

1. Classes
2. Modules
3. Monkey Patching
4. Projects
5. Gems (libraries)

# Cucumber

## and Gherkins

Before I write more things here for the More Advanced Topics,

lemme know what you think about this so far

like whether i should elaborate more or just list out the stuff to cover..


